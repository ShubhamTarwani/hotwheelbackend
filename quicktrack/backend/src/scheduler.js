const fs = require('fs');
const path = require('path');
const { scrapeBlinkit } = require('./scrapers/blinkit');
const { scrapeZepto } = require('./scrapers/zepto');
const { scrapeInstamart } = require('./scrapers/instamart');
const { sendAllAlerts } = require('./notify');

const STATE_FILE = path.join(__dirname, '../data/slots.json');

function loadSlots() {
    if (!fs.existsSync(STATE_FILE)) return [];
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveSlots(slots) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(slots, null, 2));
}

const consecutiveHits = {};

async function checkSlot(slot) {
    const scraperMap = { blinkit: scrapeBlinkit, zepto: scrapeZepto, instamart: scrapeInstamart };
    const scraper = scraperMap[slot.platform];
    if (!scraper) return;

    try {
        const result = await scraper(slot.pincode, slot.searchQuery);
        const slots = loadSlots();
        const target = slots.find(s => s.slotId === slot.slotId);
        if (!target) return;

        target.lastStatus = result.inStock;
        target.lastChecked = new Date().toISOString();
        target.lastPrice = result.price;
        target.lastProductName = result.productName;
        saveSlots(slots);

        if (result.inStock) {
            consecutiveHits[slot.slotId] = (consecutiveHits[slot.slotId] || 0) + 1;
            if (consecutiveHits[slot.slotId] >= 2) {
                await sendAllAlerts(target, result);
                consecutiveHits[slot.slotId] = 0;
            }
        } else {
            consecutiveHits[slot.slotId] = 0;
        }
    } catch (err) {
        console.error(`Scheduler error for slot ${slot.slotId}:`, err.message);
    }
}

function startScheduler() {
    setInterval(() => {
        const slots = loadSlots().filter(s => s.priority);
        slots.forEach(checkSlot);
    }, 15000);

    setInterval(() => {
        const slots = loadSlots().filter(s => !s.priority);
        slots.forEach(checkSlot);
    }, 10 * 60 * 1000);

    console.log('Scheduler started: priority every 15s, regular every 10m');
}

module.exports = { startScheduler, loadSlots, saveSlots };