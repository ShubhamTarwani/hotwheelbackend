const axios = require('axios');
const { getNextProxy, randomDelay } = require('../proxy');
const { getBrowser } = require('../browserManager');
const { pincodeToLatLng } = require('../geo');

// =============================================================================
// ZEPTO SCRAPER — PERSISTENT BROWSER + API FAST-PATH
// =============================================================================
// Primary: Tries the direct API (bff-gateway) for speed.
// Fallback: Uses the shared persistent browser to render the page.
// =============================================================================

// ── Name matching helper ────────────────────────────────────────────────────

function findBestMatch(items, query) {
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);

  for (const item of items) {
    const product = item.product || item;
    const name = (product.name || '').toLowerCase();

    const matchCount = queryWords.filter(w => name.includes(w)).length;
    const requiredMatches = Math.min(2, queryWords.length);

    if (matchCount >= requiredMatches) {
      return product;
    }
  }
  return null;
}

// ── Stock validation helper ─────────────────────────────────────────────────

function isActuallyInStock(product) {
  const outOfStockFlag = product.outOfStock === true;
  const availableFlag = product.available === false;
  const inventoryZero = product.inventory?.quantity === 0 || product.inventoryQuantity === 0;
  const availabilityStatus = product.availability?.status === 'OUT_OF_STOCK' || product.availability?.status === 'UNAVAILABLE';

  if (outOfStockFlag || availableFlag || inventoryZero || availabilityStatus) {
    return false;
  }

  const quantity = product.quantity || product.productVariant?.quantity || 0;
  const availableQuantity = product.availableQuantity || 0;

  const hasPositiveSignal = product.available === true
    || quantity > 0
    || availableQuantity > 0
    || (product.inventory?.quantity > 0)
    || product.availability?.status === 'AVAILABLE';

  return hasPositiveSignal;
}

// ── Main scraper ────────────────────────────────────────────────────────────

async function scrapeZepto(pincode, query, retries = 2) {
  await randomDelay();
  const { lat, lng } = await pincodeToLatLng(pincode);
  console.log(`[Zepto] Searching "${query}" at pincode ${pincode} (${lat}, ${lng})...`);

  // Fast path: try direct API first
  try {
    const apiResult = await scrapeZeptoApi(query);
    if (apiResult && !apiResult.error) return apiResult;
    if (apiResult && apiResult.error === 'No products found') return apiResult;
  } catch (e) {
    console.warn(`[Zepto] API fast-path failed: ${e.message}`);
  }

  // Fallback: persistent browser
  try {
    return await scrapeZeptoBrowser(query, lat, lng);
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Zepto] Retry (${retries} left): ${error.message}`);
      await new Promise(r => setTimeout(r, 2500));
      return scrapeZepto(pincode, query, retries - 1);
    }
    return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: error.message };
  }
}

// ── Direct API approach ─────────────────────────────────────────────────────

async function scrapeZeptoApi(query) {
  require('dotenv').config();
  const storeId = process.env.ZEPTO_STORE_ID || '';
  if (!storeId) return null; // Skip API if no storeId configured

  const response = await axios.post('https://bff-gateway.zepto.com/user-search-service/api/v3/search', {
    query: query,
    pageNumber: 0,
    mode: 'SEARCH',
  }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Referer': 'https://www.zepto.com/',
      'Origin': 'https://www.zepto.com',
      'storeid': storeId,
      'x-without-bearer': 'true',
      'platform': 'WEB',
    },
    timeout: 10000,
  });

  const productsFound = extractProducts(response.data, query);
  if (productsFound.length > 0) {
    return processProducts(productsFound, query);
  }
  return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: 'No products found' };
}

// ── Persistent browser approach ─────────────────────────────────────────────

async function scrapeZeptoBrowser(query, lat, lng) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    geolocation: { latitude: Number(lat), longitude: Number(lng) },
    permissions: ['geolocation'],
  });

  // Inject session cookies if available
  require('dotenv').config();
  const sessionStr = process.env.ZEPTO_SESSION_COOKIE || '';
  const customCookies = sessionStr.split(';').map(p => {
    const [n, ...vParts] = p.split('=');
    const v = vParts.join('=');
    return n && n.trim() ? { name: n.trim(), value: v ? v.trim() : '', domain: '.zepto.com', path: '/' } : null;
  }).filter(Boolean);

  if (customCookies.length > 0) {
    await context.addCookies(customCookies);
  }

  const page = await context.newPage();
  let searchData = null;

  page.on('response', async r => {
    if (r.url().includes('search') || r.url().includes('v2/get_page')) {
      try {
        const j = await r.json();
        if (JSON.stringify(j).toLowerCase().includes(query.toLowerCase().trim())) {
          searchData = j;
        }
      } catch (e) {}
    }
  });

  try {
    await page.goto(`https://www.zepto.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait a bit for XHRs to complete
    await page.waitForTimeout(3000);

    let productsFound = [];
    if (searchData) {
      productsFound = extractProducts(searchData, query);
    }

    if (productsFound.length > 0) {
      return processProducts(productsFound, query);
    }

    return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: 'No products found' };
  } finally {
    await page.close();
    await context.close();
  }
}

// ── Product extraction helper ───────────────────────────────────────────────

function extractProducts(data, query) {
  const productsFound = [];
  const queryLower = query.toLowerCase().trim();

  function extract(obj) {
    if (!obj) return;
    if (typeof obj === 'object') {
      if (obj.productResponse && obj.productResponse.product && obj.productResponse.product.name) {
        const name = obj.productResponse.product.name.toLowerCase();
        if (name.includes(queryLower) || queryLower.split(' ').filter(w => w.length > 2).some(w => name.includes(w))) {
          productsFound.push({
            name: obj.productResponse.product.name,
            outOfStock: obj.productResponse.outOfStock,
            sellingPrice: obj.productResponse.sellingPrice,
            mrp: obj.productResponse.mrp,
            quantity: obj.productResponse.quantity,
            availableQuantity: obj.productResponse.availableQuantity,
            productVariant: obj.productResponse.productVariant,
            isActive: obj.productResponse.isActive,
          });
        }
      } else if (obj.name && typeof obj.name === 'string' && obj.name.toLowerCase().includes(queryLower)) {
        if (obj.sellingPrice !== undefined || obj.mrp !== undefined || obj.outOfStock !== undefined) {
          productsFound.push(obj);
        }
      }

      if (Array.isArray(obj)) {
        obj.forEach(extract);
      } else {
        Object.values(obj).forEach(extract);
      }
    }
  }
  extract(data);
  return productsFound;
}

// ── Process matched products ────────────────────────────────────────────────

function processProducts(productsFound, query) {
  const firstProduct = findBestMatch(productsFound, query);
  if (!firstProduct) {
    return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: 'No matching product found' };
  }

  const inStock = isActuallyInStock(firstProduct);

  console.log('[ZEPTO DEBUG]', JSON.stringify({
    query,
    matchedProduct: firstProduct?.name,
    outOfStock: firstProduct?.outOfStock,
    quantity: firstProduct?.quantity,
    availableQuantity: firstProduct?.availableQuantity,
    isActive: firstProduct?.isActive,
    finalDecision: inStock
  }, null, 2));

  const rawPrice = firstProduct.sellingPrice ?? firstProduct.mrp ?? 0;
  const price = rawPrice > 0 ? `₹${(rawPrice / 100).toFixed(0)}` : 'N/A';

  return {
    inStock,
    price,
    productName: firstProduct.name || query,
    storeName: 'Zepto'
  };
}

module.exports = { scrapeZepto };
