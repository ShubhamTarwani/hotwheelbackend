const { getBrowser } = require('../browserManager');
const { pincodeToLatLng } = require('../geo');

// Global state to track consecutive failures for BETA fallback
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

async function scrapeInstamart(pincode, query) {
  const { lat, lng } = await pincodeToLatLng(pincode);
  
  if (consecutiveFailures >= MAX_FAILURES) {
    return {
      inStock: false,
      price: 'N/A',
      productName: query,
      storeName: 'Instamart',
      error: 'BETA feature skipped due to consecutive failures.'
    };
  }

  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      geolocation: { latitude: Number(lat), longitude: Number(lng) },
      permissions: ['geolocation'],
    });
    
    const page = await context.newPage();
    
    // Construct search URL
    const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Basic evaluation for availability (mocked structure)
    // In reality, Akamai might block or the layout might require specific selectors
    const productData = await page.evaluate(() => {
      const firstItem = document.querySelector('[data-testid="item-card"]'); // Placeholder selector
      if (!firstItem) return null;
      
      const outOfStockOverlay = firstItem.querySelector('[data-testid="out-of-stock"]');
      const nameEl = firstItem.querySelector('[data-testid="item-name"]');
      const priceEl = firstItem.querySelector('[data-testid="item-price"]');
      
      return {
        inStock: !outOfStockOverlay,
        name: nameEl ? nameEl.innerText : null,
        price: priceEl ? priceEl.innerText : 'N/A'
      };
    });

    await page.close();
    await context.close();

    if (!productData) {
      consecutiveFailures++;
      return {
        inStock: false,
        price: 'N/A',
        productName: query,
        storeName: 'Instamart',
        error: 'Product not found on page'
      };
    }

    // Reset failures on success
    consecutiveFailures = 0;

    return {
      inStock: productData.inStock && (productData.name || '').toLowerCase().includes('hot wheels'),
      price: productData.price,
      productName: productData.name || query,
      storeName: 'Instamart'
    };

  } catch (error) {
    if (context) await context.close();
    consecutiveFailures++;
    console.error('Instamart scraping error:', error.message);
    throw error;
  }
}

module.exports = { scrapeInstamart };
