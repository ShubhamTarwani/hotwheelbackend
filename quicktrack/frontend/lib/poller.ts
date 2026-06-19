// Polling logic for HW Tracker

import { SlotConfig, ScrapeResult, buildQuery } from './store';

// Re-export types so existing imports still work
export type { SlotConfig, ScrapeResult };

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const consecutiveHits: Record<number, number> = {};

export async function checkSlot(slot: SlotConfig): Promise<ScrapeResult | null> {
  const query = slot.searchQuery || buildQuery(slot.carName, slot.carType);
  if (!query || !slot.pincode) return null;
  
  try {
    const res = await fetch(`${BACKEND_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: slot.platform,
        pincode: slot.pincode,
        query: query
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Scraping failed');
    }
    
    const data = await res.json();
    
    // Safety net: double-check before returning inStock = true
    let finalInStock = data.inStock;
    if (finalInStock) {
      consecutiveHits[slot.slotId] = (consecutiveHits[slot.slotId] || 0) + 1;
      if (consecutiveHits[slot.slotId] < 2) {
        // First positive hit. Wait for confirmation.
        finalInStock = false;
      }
    } else {
      consecutiveHits[slot.slotId] = 0;
    }

    return {
      ...data,
      inStock: finalInStock,
      lastChecked: Date.now()
    };
  } catch (error: any) {
    console.error(`Slot ${slot.slotId} check failed:`, error);
    return null;
  }
}

// Keep-alive for backend
export function startKeepAlive() {
  const ping = () => {
    fetch(`${BACKEND_URL}/ping`).catch(() => {});
  };
  ping(); // Initial ping
  return setInterval(ping, 10 * 60 * 1000); // Every 10 minutes
}
