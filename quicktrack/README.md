# HW Tracker — Hot Wheels Availability Monitor

Track Hot Wheels (Super Treasure Hunts, Treasure Hunts, Mainlines, and new drops) across Blinkit, Zepto, and Instamart with real-time polling and aggressive alerting.

## Architecture

- **Backend**: Node.js + Express (Scraper API using Axios/Cheerio & Playwright)
- **Frontend**: Next.js 14 App Router + Tailwind CSS
- **State**: `localStorage` + In-memory (No Database required)

## Features

- **Wishlist**: Add specific Hot Wheels cars you're hunting for with type classification (STH/TH/Mainline/Any Drop)
- **4 Tracking Slots**: 2 Priority (15s polling), 2 Regular (10m polling) — assign wishlist items to slots
- **Collection**: Trophy shelf showing all found cars with stats
- **Smart Queries**: Auto-generates search queries based on car type (e.g., STH → "hot wheels super treasure hunt")
- **Hot Wheels Filter**: Backend scrapers only confirm `inStock = true` if the product name contains "hot wheels" (prevents false positives)
- **Alarm System**:
  - Web Audio API (Repeating Beep)
  - Web Notifications API (30 alerts over 2 minutes)
  - Fullscreen Visual Overlay with car details
  - Telegram Bot Integration
  - Twilio WhatsApp Sandbox Integration
  - "Mark as Found?" prompt after alarm dismissal
- **Radar**: Animated SVG radar with color-coded blips (green = in stock, red = hunting STH/TH, gray = mainline)
- **Geolocation**: Auto-detects supported cities (Delhi, Mumbai, Bangalore, Hyderabad, Nagpur)
- **Keep-Alive**: Built-in pinger to prevent Render backend sleep

---

## Running Locally

### Terminal 1: Backend
```bash
cd quicktrack/backend
npm install
npx playwright install chromium
npm start
# → QuickTrack backend running on port 4000
```

### Terminal 2: Frontend
```bash
cd quicktrack/frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Deployment

### Backend (Render)

1. Push the `backend` folder to a GitHub repository.
2. Log into [Render](https://render.com) and create a new **Web Service**.
3. Connect your repository and select the `backend` folder as the Root Directory.
4. Set Build Command: `npm install && npx playwright install chromium`
5. Set Start Command: `npm start`
6. **Environment Variables**:
   - `PORT`: `4000` (Render will override this)
   - `WEBSHARE_API_KEY`: Your WebShare proxy token (optional, falls back to direct IP if missing)
7. Deploy. Note the deployment URL.

### Frontend (Vercel)

1. Push the `frontend` folder to a GitHub repository.
2. Log into [Vercel](https://vercel.com) and import the project.
3. Select Next.js as the framework.
4. **Environment Variables**:
   - `NEXT_PUBLIC_BACKEND_URL`: The URL of your Render backend (e.g., `https://hw-tracker-api.onrender.com`)
5. Deploy.

---

## External Integrations

### Telegram Bot
1. Open Telegram → search `@BotFather` → send `/newbot` → follow prompts.
2. Copy the **Bot Token** provided.
3. Send `/start` to your new bot.
4. Get your **Chat ID**: search `@userinfobot`, start it.
5. Enter Token + Chat ID in HW Tracker Settings page.

### Twilio WhatsApp Sandbox
1. Create account at [Twilio](https://twilio.com).
2. Go to **Messaging > Try it out > Send a WhatsApp message**.
3. Join the sandbox by sending the specified code.
4. Copy **Account SID**, **Auth Token**, sandbox number (From), your number (To).
5. Enter in Settings. Format: `whatsapp:+1234567890`.

---

## Scraper Notes

The scraper endpoint URLs and headers for Blinkit and Zepto are reverse-engineered from their web apps. They **will break** when these platforms update their internal APIs. To fix:

1. Open the platform's website in Chrome
2. Press F12 → Network tab → filter XHR
3. Search for a product
4. Find the API call returning product JSON
5. Copy the URL and update the constant at the top of the respective scraper file
6. Check the headers and update `BLINKIT_HEADERS` / `ZEPTO_HEADERS` accordingly
