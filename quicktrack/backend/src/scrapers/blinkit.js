const axios = require('axios');
const { getNextProxy, randomDelay } = require('../proxy');
const { getBrowser } = require('../browserManager');

// =============================================================================
// BLINKIT SCRAPER — AXIOS API + PERSISTENT BROWSER FALLBACK
// =============================================================================
// Primary: Direct axios call to Blinkit's internal search API.
// Fallback: Uses the shared persistent browser (no new Chromium launch).
// =============================================================================

const { pincodeToLatLng } = require('../geo');

// ── Name matching helper ────────────────────────────────────────────────────

function findBestMatch(products, query) {
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  for (const product of products) {
    const name = (product.name || product.product_name || '').toLowerCase();
    const matchCount = queryWords.filter(w => name.includes(w)).length;
    const requiredMatches = Math.min(2, queryWords.length);
    if (matchCount >= requiredMatches) return product;
  }
  return null;
}

// ── Product extraction (works on both API JSON and SSR state) ───────────────

function extractProducts(data, query) {
  const productsFound = [];
  const queryLower = query.toLowerCase().trim();
  const isSearchingForBooks = queryLower.includes('book') || queryLower.includes('colouring');

  function extract(obj) {
    if (!obj) return;
    if (typeof obj === 'object') {
      const name = obj.name || obj.product_name || '';
      if (name && typeof name === 'string' && name.toLowerCase().includes(queryLower)) {
        const n = name.toLowerCase();
        const isBook = n.includes('book') || n.includes('colouring') || n.includes('stickers') || n.includes('publications');
        if (!isBook || isSearchingForBooks) {
          productsFound.push(obj);
        }
      }
      Object.values(obj).forEach(extract);
    }
  }
  extract(data);
  return productsFound;
}

// ── Main scraper ────────────────────────────────────────────────────────────

async function scrapeBlinkit(pincode, query, retries = 2) {
  await randomDelay();
  const { lat, lng } = await pincodeToLatLng(pincode);
  console.log(`[Blinkit] Searching "${query}" at pincode ${pincode} (${lat}, ${lng})...`);

  // Fast path: try direct API
  try {
    const apiResult = await scrapeBlinkitApi(query, lat, lng);
    if (apiResult && !apiResult.error) return apiResult;
  } catch (e) {
    console.warn(`[Blinkit] API fast-path failed: ${e.message}`);
  }

  // Fallback: persistent browser
  try {
    return await scrapeBlinkitBrowser(query, lat, lng);
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Blinkit] Retry (${retries} left): ${error.message}`);
      await new Promise(r => setTimeout(r, 2000));
      return scrapeBlinkit(pincode, query, retries - 1);
    }
    console.error('[Blinkit] Scraping failed:', error.message);
    return { inStock: false, price: 'N/A', productName: query, storeName: 'Blinkit', error: error.message };
  }
}

// ── Direct API approach ─────────────────────────────────────────────────────

async function scrapeBlinkitApi(query, lat, lng) {
  const response = await axios.get('https://blinkit.com/v6/search/products', {
    params: { q: query, start: 0, size: 10 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
      'lat': String(lat),
      'lng': String(lng),
      'Cookie': `gr_1_lat=${lat}; gr_1_lon=${lng}`,
    },
    timeout: 10000,
  });

  const productsFound = extractProducts(response.data, query);
  if (productsFound.length > 0) {
    return processBlinkitProducts(productsFound, query);
  }
  return null; // Signal to try the browser fallback
}

// ── Persistent browser approach ─────────────────────────────────────────────

async function scrapeBlinkitBrowser(query, lat, lng) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    geolocation: { latitude: Number(lat), longitude: Number(lng) },
    permissions: ['geolocation'],
  });

  // Inject location cookies
  require('dotenv').config();
  const sessionStr = process.env.BLINKIT_SESSION_COOKIE || '';
  const customCookies = sessionStr.split(';').map(p => {
    const [n, v] = p.split('=');
    return n ? { name: n.trim(), value: v ? v.trim() : '', domain: '.blinkit.com', path: '/' } : null;
  }).filter(Boolean);

  await context.addCookies([
    { name: 'gr_1_lat', value: String(lat), domain: '.blinkit.com', path: '/' },
    { name: 'gr_1_lon', value: String(lng), domain: '.blinkit.com', path: '/' },
    ...customCookies
  ]);

  // Inject lat/lng headers on every request
  await context.route('**/*', route => {
    const reqHeaders = route.request().headers();
    reqHeaders['lat'] = String(lat);
    reqHeaders['lng'] = String(lng);
    route.continue({ headers: reqHeaders });
  });

  const page = await context.newPage();
  let searchData = null;

  page.on('response', async r => {
    if (r.url().includes('layout/search') || r.url().includes('search/products')) {
      try {
        const j = await r.json();
        if (JSON.stringify(j).toLowerCase().includes(query.toLowerCase())) {
          searchData = j;
        }
      } catch (e) {}
    }
  });

  try {
    await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for XHRs
    if (!searchData) await page.waitForTimeout(3000);

    if (!searchData) {
      return { inStock: false, price: 'N/A', productName: query, storeName: 'Blinkit', error: 'No search data captured' };
    }

    const productsFound = extractProducts(searchData, query);
    if (productsFound.length > 0) {
      return processBlinkitProducts(productsFound, query);
    }

    return { inStock: false, price: 'N/A', productName: query, storeName: 'Blinkit', error: 'No products found' };
  } finally {
    await page.close();
    await context.close();
  }
}

// ── Process products ────────────────────────────────────────────────────────

function processBlinkitProducts(productsFound, query) {
  const firstProduct = findBestMatch(productsFound, query) || productsFound[0];

  const productName = firstProduct.name || firstProduct.product_name || query;
  const inStock = (firstProduct.inventory > 0 || firstProduct.in_stock === true);
  const price = firstProduct.price ? `₹${firstProduct.price}` : (firstProduct.actual_price ? `₹${firstProduct.actual_price}` : 'N/A');

  console.log(`[Blinkit] Found: "${productName}" | inStock: ${inStock} | Price: ${price}`);
  return { inStock, price, productName, storeName: 'Blinkit' };
}

module.exports = { scrapeBlinkit };
