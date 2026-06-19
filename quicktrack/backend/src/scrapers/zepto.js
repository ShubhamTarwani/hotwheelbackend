const { getNextProxy, randomDelay } = require('../proxy');

function findBestMatch(items, query) {
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  
  for (const item of items) {
    const product = item.product || item;
    const name = (product.name || '').toLowerCase();
    
    // Require at least 2 query words to appear in the product name
    // (or all words if query has fewer than 2 meaningful words)
    const matchCount = queryWords.filter(w => name.includes(w)).length;
    const requiredMatches = Math.min(2, queryWords.length);
    
    if (matchCount >= requiredMatches) {
      return product;
    }
  }
  return null; // no real match found
}

function isActuallyInStock(product) {
  // Check every signal that could indicate stock status
  const outOfStockFlag = product.outOfStock === true;
  const availableFlag = product.available === false;
  const inventoryZero = product.inventory?.quantity === 0 || product.inventoryQuantity === 0;
  const availabilityStatus = product.availability?.status === 'OUT_OF_STOCK' || product.availability?.status === 'UNAVAILABLE';
  
  // If ANY signal says it's out of stock, trust that over a positive signal
  if (outOfStockFlag || availableFlag || inventoryZero || availabilityStatus) {
    return false;
  }
  
  // Require at least one positive confirmation, not just "absence of negative"
  const hasPositiveSignal = product.available === true 
    || (product.inventory?.quantity > 0) 
    || product.availability?.status === 'AVAILABLE';
  
  return hasPositiveSignal;
}

async function scrapeZepto(pincode, query, retries = 2) {
  await randomDelay();
  const proxyStr = getNextProxy();

  const { chromium } = require('playwright-extra');
  const stealth = require('puppeteer-extra-plugin-stealth')();
  chromium.use(stealth);

  const launchOptions = { headless: true };
  if (proxyStr) {
     launchOptions.proxy = { server: proxyStr.host ? `http://${proxyStr.host}:${proxyStr.port}` : proxyStr };
  }

  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    
    // Inject custom session cookies if provided (for location-specific Zepto inventory)
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
      if (r.url().includes('v2/get_page') || r.url().includes('search')) {
        try {
          const j = await r.json();
          if (JSON.stringify(j).toLowerCase().includes(query.toLowerCase().trim())) {
             searchData = j;
          }
        } catch(e) {}
      }
    });

    await page.goto(`https://www.zepto.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle', timeout: 15000 });
    
    // Give XHRs a second to finish
    await page.waitForTimeout(2000);

    let productsFound = [];
    const queryLower = query.toLowerCase().trim();
    
    function extract(obj) {
       if (!obj) return;
       if (typeof obj === 'object') {
          if (obj.name && typeof obj.name === 'string' && obj.name.toLowerCase().includes(queryLower)) {
             productsFound.push(obj);
          }
          Object.values(obj).forEach(extract);
       }
    }
    
    if (searchData) {
       extract(searchData);
    }
    
    if (productsFound.length === 0) {
      // Fallback: Parse the DOM for Product Cards
      const domProducts = await page.evaluate((q) => {
        const items = [];
        // Zepto product cards usually have 'a' tags or generic divs
        document.querySelectorAll('a, div').forEach(el => {
           const txt = el.innerText || '';
           if (txt.toLowerCase().includes(q) && txt.includes('₹') && txt.length < 200 && !el.children.length) {
              items.push({
                 name: txt.split('\n')[0],
                 price: txt.match(/₹\s*\d+/)?.[0] || 'N/A',
                 outOfStock: txt.toLowerCase().includes('out of stock')
              });
           }
        });
        return items;
      }, queryLower);
      
      if (domProducts.length > 0) {
        const p = domProducts[0];
        return {
           inStock: !p.outOfStock,
           price: p.price,
           productName: p.name || query,
           storeName: 'Zepto'
        };
      }
    }

    if (productsFound.length > 0) {
       const firstProduct = findBestMatch(productsFound, query);
       if (!firstProduct) {
         return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: 'No matching product found' };
       }
       
       const inStock = isActuallyInStock(firstProduct);
       
       console.log('[ZEPTO DEBUG]', JSON.stringify({
         query,
         matchedProduct: firstProduct?.name,
         outOfStock: firstProduct?.outOfStock,
         available: firstProduct?.available,
         inventory: firstProduct?.inventory,
         availabilityStatus: firstProduct?.availability?.status,
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

    return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: 'No products found' };

  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2500));
      return scrapeZepto(pincode, query, retries - 1);
    }
    return { inStock: false, price: 'N/A', productName: query, storeName: 'Zepto', error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeZepto };
