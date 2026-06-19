const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { scrapeBlinkit } = require('./scrapers/blinkit');
const { scrapeZepto } = require('./scrapers/zepto');
const { scrapeInstamart } = require('./scrapers/instamart');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Prevent large payloads

// Logging Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per `window` (here, per 1 minute)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/scrape', limiter);

// Keep-alive endpoint for Render
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/scrape', async (req, res) => {
  const { platform, pincode, query } = req.body;

  if (!platform || !pincode || !query) {
    return res.status(400).json({ error: 'Missing required parameters: platform, pincode, query' });
  }

  try {
    let result;
    switch (platform.toLowerCase()) {
      case 'blinkit':
        result = await scrapeBlinkit(pincode, query);
        break;
      case 'zepto':
        result = await scrapeZepto(pincode, query);
        break;
      case 'instamart':
        result = await scrapeInstamart(pincode, query);
        break;
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    res.json(result);
  } catch (error) {
    console.error(`Error scraping ${platform}:`, error.message);
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`QuickTrack backend running on port ${PORT}`);
});
