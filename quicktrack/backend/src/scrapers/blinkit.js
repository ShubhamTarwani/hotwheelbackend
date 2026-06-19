const { getNextProxy, randomDelay } = require('../proxy');

// =============================================================================
// BLINKIT SCRAPER — PLAYWRIGHT DOM/API HYBRID
// =============================================================================
// Blinkit uses heavy Cloudflare protections that block standard HTTP clients.
// This scraper launches a hidden Chromium browser to naturally bypass 
// fingerprinting and TLS checks.
// =============================================================================

// Known lat/lng for supported pincodes (avoids geocoding API calls)
const PINCODE_COORDS = {
  '440014': { lat: '21.1775074', lng: '79.0899245' },
  '440001': { lat: '21.1466', lng: '79.0849' },  // Nagpur central
  '110001': { lat: '28.6353', lng: '77.2250' },  // Delhi
  '110002': { lat: '28.6328', lng: '77.2197' },  // Delhi
  '400001': { lat: '18.9388', lng: '72.8354' },  // Mumbai
  '560001': { lat: '12.9716', lng: '77.5946' },  // Bangalore
  '500001': { lat: '17.3850', lng: '78.4867' },  // Hyderabad
};

// ── Geocoding helper ────────────────────────────────────────────────────────

async function pincodeToLatLng(pincode) {
  // Use known coordinates first
  if (PINCODE_COORDS[pincode]) return PINCODE_COORDS[pincode];

  try {
    const geo = await axios.get(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`,
      { headers: { 'User-Agent': 'HWTracker/1.0' }, timeout: 5000 }
    );
    if (geo.data?.[0]) {
      return { lat: geo.data[0].lat, lng: geo.data[0].lon };
    }
  } catch (error) {
    console.warn('Geocoding fallback triggered:', error.message);
  }
  return { lat: '21.1458', lng: '79.0882' }; // fallback: Nagpur (440014)
}



// ── Main scraper ────────────────────────────────────────────────────────────

async function scrapeBlinkit(pincode, query, retries = 2) {
  await randomDelay();
  const proxyStr = getNextProxy();
  const { lat, lng } = await pincodeToLatLng(pincode);

  console.log(`[Blinkit] Searching "${query}" at pincode ${pincode} (${lat}, ${lng}) via Playwright...`);
  const { chromium } = require('playwright-extra');
  const stealth = require('puppeteer-extra-plugin-stealth')();
  chromium.use(stealth);
  
  const launchOptions = { headless: true };
  if (proxyStr) {
     // Playwright proxy format: server: "http://user:pass@host:port" or "http://host:port"
     launchOptions.proxy = { server: proxyStr.host ? `http://${proxyStr.host}:${proxyStr.port}` : proxyStr };
  }

  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    
    // Inject custom session cookies if provided (fixes A/B testing & anonymous inventory gaps)
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

    await context.route('**/*', route => {
      const reqHeaders = route.request().headers();
      reqHeaders['lat'] = String(lat);
      reqHeaders['lng'] = String(lng);
      route.continue({ headers: reqHeaders });
    });

    const page = await context.newPage();
    let searchData = null;

    page.on('response', async r => {
      const url = r.url();
      if (url.includes('layout/search')) {
        try {
          const j = await r.json();
          // Keep the JSON if it contains our query
          if (JSON.stringify(j).toLowerCase().includes(query.toLowerCase())) {
             searchData = j;
          }
        } catch(e) {}
      }
    });

    await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle', timeout: 15000 });

    if (!searchData) {
       // Allow a little extra time for straggling XHRs
       await page.waitForTimeout(2000);
    }

    if (!searchData) {
       return { inStock: false, price: 'N/A', productName: query, storeName: 'Blinkit', error: 'No products found (No search data)' };
    }

    // Recursively extract product object
    let productsFound = [];
    const queryLower = query.toLowerCase().trim();
    const isSearchingForBooks = queryLower.includes('book') || queryLower.includes('colouring');
    
    function extract(obj) {
       if (!obj) return;
       if (typeof obj === 'object') {
          if ((obj.name && typeof obj.name === 'string' && obj.name.toLowerCase().includes(queryLower)) || 
              (obj.product_name && typeof obj.product_name === 'string' && obj.product_name.toLowerCase().includes(queryLower))) {
             
             const n = (obj.name || obj.product_name).toLowerCase();
             // Ignore books and stickers if the user didn't ask for them
             const isBook = n.includes('book') || n.includes('colouring') || n.includes('stickers') || n.includes('publications');
             
             if (!isBook || isSearchingForBooks) {
               productsFound.push(obj);
             }
          }
          Object.values(obj).forEach(extract);
       }
    }
    extract(searchData);

    if (productsFound.length > 0) {
       // Prioritize in-stock products!
       const inStockProduct = productsFound.find(p => p.inventory > 0 || p.in_stock === true);
       const targetProduct = inStockProduct || productsFound[0];
       
       const productName = targetProduct.name || targetProduct.product_name || query;
       const inStock = (targetProduct.inventory > 0 || targetProduct.in_stock === true);
       const price = targetProduct.price ? `₹${targetProduct.price}` : (targetProduct.actual_price ? `₹${targetProduct.actual_price}` : 'N/A');
       
       console.log(`[Blinkit] Found: "${productName}" | inStock: ${inStock} | Price: ${price}`);
       return { inStock, price, productName, storeName: 'Blinkit' };
    } else {
       return { inStock: false, price: 'N/A', productName: query, storeName: 'Blinkit', error: 'No products found' };
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Blinkit] Retry (${retries} left): ${error.message}`);
      await new Promise(r => setTimeout(r, 2000));
      return scrapeBlinkit(pincode, query, retries - 1);
    }
    console.error('[Blinkit] Scraping failed:', error.message);
    return {
      inStock: false,
      price: 'N/A',
      productName: query,
      storeName: 'Blinkit',
      error: error.message
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeBlinkit };






