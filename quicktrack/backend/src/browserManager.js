const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

let browserInstance = null;
let launchPromise = null;

async function getBrowser() {
  // If browser exists and is still connected, reuse it
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // If a launch is already in progress, wait for it
  if (launchPromise) {
    return launchPromise;
  }

  // Launch a new persistent browser
  launchPromise = (async () => {
    try {
      browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
        ]
      });

      // Auto-relaunch if the browser crashes
      browserInstance.on('disconnected', () => {
        console.warn('[BrowserManager] Browser disconnected, will relaunch on next request');
        browserInstance = null;
        launchPromise = null;
      });

      console.log('[BrowserManager] Persistent browser launched');
      return browserInstance;
    } catch (err) {
      console.error('[BrowserManager] Failed to launch browser:', err.message);
      launchPromise = null;
      throw err;
    }
  })();

  return launchPromise;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    launchPromise = null;
    console.log('[BrowserManager] Browser closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = { getBrowser, closeBrowser };
