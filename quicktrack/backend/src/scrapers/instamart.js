const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

// Global state to track consecutive failures for BETA fallback
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

async function scrapeInstamart(pincode, query) {
  if (consecutiveFailures >= MAX_FAILURES) {
    return {
      inStock: false,
      price: 'N/A',
      productName: query,
      storeName: 'Instamart',
      error: 'BETA feature skipped due to consecutive failures.'
    };
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Construct search URL
    const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 15000 });
    
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

    await browser.close();

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
    if (browser) await browser.close();
    consecutiveFailures++;
    console.error('Instamart scraping error:', error.message);
    throw error;
  }
}

module.exports = { scrapeInstamart };
