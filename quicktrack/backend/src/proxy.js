const axios = require('axios');

// Placeholder for proxy list
let proxyList = [];
let proxyIndex = 0;

/**
 * Fetches proxies from WebShare if WEBSHARE_API_KEY is provided.
 * Otherwise, falls back to direct requests.
 */
async function fetchProxies() {
  const apiKey = process.env.WEBSHARE_API_KEY;
  if (!apiKey) {
    console.warn('WEBSHARE_API_KEY not found. Falling back to direct requests (no proxy).');
    return;
  }

  try {
    const response = await axios.get('https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=100', {
      headers: {
        Authorization: `Token ${apiKey}`
      }
    });

    if (response.data && response.data.results) {
      proxyList = response.data.results.map(p => ({
        host: p.proxy_address,
        port: p.port,
        auth: {
          username: p.username,
          password: p.password
        }
      }));
      console.log(`Loaded ${proxyList.length} proxies from WebShare.`);
    }
  } catch (error) {
    console.error('Failed to fetch proxies from WebShare:', error.message);
    console.warn('Falling back to direct requests.');
  }
}

/**
 * Gets the next proxy in a round-robin fashion.
 * Returns null if no proxies are configured.
 */
function getNextProxy() {
  if (proxyList.length === 0) return null;
  
  const proxy = proxyList[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxyList.length;
  return proxy;
}

/**
 * Helper to add random delay (jitter) between 1s and 3s.
 */
async function randomDelay() {
  const delay = Math.floor(Math.random() * 2000) + 1000;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Initial fetch
fetchProxies();

module.exports = {
  getNextProxy,
  randomDelay
};
