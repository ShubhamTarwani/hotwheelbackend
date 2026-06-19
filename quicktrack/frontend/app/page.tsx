'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SlotCard from '../components/SlotCard';
import AlarmOverlay from '../components/AlarmOverlay';
import {
  SlotConfig, ScrapeResult, DEFAULT_SLOTS,
  getSlots, saveSlots, getSettings, getDashboardStats,
  addAlertLog, markAsFound, getTypeLabel,
  getStoreLink, buildQuery,
} from '../lib/store';
import { checkSlot, startKeepAlive } from '../lib/poller';
import { playAlarmSound, stopAlarmSound, triggerBrowserNotifications, stopBrowserNotifications, buildAlarmMessage, buildTelegramMessage } from '../lib/alarm';
import { sendTelegramMessage, sendTwilioWhatsApp } from '../lib/notify';
import { watchLocation } from '../lib/geo';

export default function Dashboard() {
  const [slots, setSlots] = useState<SlotConfig[]>(DEFAULT_SLOTS);
  const [results, setResults] = useState<Record<number, ScrapeResult | null>>({});
  const [checkingState, setCheckingState] = useState<Record<number, boolean>>({});
  const [activeAlarm, setActiveAlarm] = useState<{ result: ScrapeResult; slot: SlotConfig } | null>(null);
  const [showFoundPrompt, setShowFoundPrompt] = useState<{ slot: SlotConfig; result: ScrapeResult } | null>(null);
  const [stats, setStats] = useState({ carsHunting: 0, foundToday: 0, thSthFoundTotal: 0, collectionSize: 0 });

  // Settings
  const [settings, setSettingsState] = useState(getSettings());

  const refreshStats = useCallback(() => setStats(getDashboardStats()), []);

  // Initialization
  useEffect(() => {
    const s = getSettings();
    setSettingsState(s);
    setSlots(getSlots());
    refreshStats();
    const kaInterval = startKeepAlive();
    return () => clearInterval(kaInterval);
  }, [refreshStats]);

  // Location handling
  useEffect(() => {
    const locDisplay = document.getElementById('global-location-display');

    if (settings.autoLocation) {
      if (locDisplay) locDisplay.textContent = 'Locating...';
      const watchId = watchLocation((pincode, city) => {
        if (locDisplay) locDisplay.textContent = `${city} (${pincode})`;
        setSlots(prev => {
          const updated = prev.map(s => ({ ...s, pincode }));
          saveSlots(updated);
          return updated;
        });
      }, (err) => {
        console.warn('Location error:', err);
        if (locDisplay) locDisplay.textContent = settings.defaultPincode ? `Manual (${settings.defaultPincode})` : 'Set Location';
      });
      return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    } else {
      const pin = settings.defaultPincode || settings.pincode;
      if (locDisplay) locDisplay.textContent = pin ? `${settings.city} (${pin})` : 'Set Location';
      setSlots(prev => {
        const updated = prev.map(s => ({ ...s, pincode: pin }));
        saveSlots(updated);
        return updated;
      });
    }
  }, [settings]);

  // Alarm Handler
  const handleInStock = useCallback((result: ScrapeResult, slot: SlotConfig) => {
    addAlertLog({
      timestamp: Date.now(),
      productName: slot.carName || result.productName,
      carType: slot.carType,
      platform: slot.platform,
      pincode: slot.pincode,
      price: result.price,
    });

    setActiveAlarm({ result, slot });
    playAlarmSound(settings.volume);

    const alarmMsg = buildAlarmMessage(slot.carName || result.productName, getTypeLabel(slot.carType), slot.platform, result.price, slot.pincode);
    triggerBrowserNotifications('🔥 HW Tracker — FOUND!', alarmMsg);

    const tgMsg = buildTelegramMessage(slot.carName || result.productName, getTypeLabel(slot.carType), slot.platform, result.price, slot.pincode);
    if (settings.tgToken && settings.tgChatId) {
      sendTelegramMessage(settings.tgToken, settings.tgChatId, tgMsg);
    }
    if (settings.twSid && settings.twToken && settings.twFrom && settings.twTo) {
      sendTwilioWhatsApp(settings.twSid, settings.twToken, settings.twFrom, settings.twTo, tgMsg);
    }
  }, [settings]);

  // Polling Logic
  const performCheck = useCallback(async (slot: SlotConfig) => {
    const query = slot.searchQuery || buildQuery(slot.carName, slot.carType);
    if (!query || !slot.pincode) return;

    if (slot.platform === 'instamart' && !settings.enableInstamart) {
      setResults(prev => ({ ...prev, [slot.slotId]: { inStock: false, price: 'N/A', productName: slot.carName || query, storeName: 'Instamart', error: 'Instamart disabled', lastChecked: Date.now() } }));
      return;
    }

    setCheckingState(prev => ({ ...prev, [slot.slotId]: true }));
    const result = await checkSlot(slot);

    if (result) {
      setResults(prev => {
        const prevResult = prev[slot.slotId];
        const isAcknowledged = prevResult?.acknowledged && result.inStock;
        
        const shouldAlarm = result.inStock && (!prevResult || !prevResult.inStock) && !isAcknowledged;
        if (shouldAlarm) {
          handleInStock(result, slot);
        }
        return { ...prev, [slot.slotId]: { ...result, acknowledged: isAcknowledged } };
      });
    }
    setCheckingState(prev => ({ ...prev, [slot.slotId]: false }));
  }, [settings, handleInStock]);

  // Polling Intervals
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    slots.forEach((slot, index) => {
      const query = slot.searchQuery || buildQuery(slot.carName, slot.carType);
      if (!query) return;
      const interval = slot.priority ? 15000 : 10 * 60 * 1000;
      intervals.push(setInterval(() => performCheck(slot), interval));
    });

    // Initial check
    slots.forEach(slot => {
      const query = slot.searchQuery || buildQuery(slot.carName, slot.carType);
      if (query) performCheck(slot);
    });

    return () => intervals.forEach(clearInterval);
  }, [slots, performCheck]);

  const updateSlotConfig = (newConfig: SlotConfig) => {
    const updated = slots.map(s => s.slotId === newConfig.slotId ? newConfig : s);
    setSlots(updated);
    saveSlots(updated);
    performCheck(newConfig);
  };

  const forceCheck = (id: number) => {
    const slot = slots.find(s => s.slotId === id);
    if (slot) performCheck(slot);
  };

  const handleAcknowledge = useCallback((id: number) => {
    setResults(prev => {
      const prevResult = prev[id];
      if (prevResult) {
        return { ...prev, [id]: { ...prevResult, acknowledged: true } };
      }
      return prev;
    });
  }, []);

  const dismissAlarm = () => {
    const alarmData = activeAlarm;
    setActiveAlarm(null);
    stopAlarmSound();
    stopBrowserNotifications();
    
    if (alarmData) {
      handleAcknowledge(alarmData.slot.slotId);
    }

    // Show "Mark as Found?" prompt
    if (alarmData && alarmData.slot.wishlistItemId) {
      setShowFoundPrompt(alarmData);
    }
  };

  const handleMarkFound = () => {
    if (showFoundPrompt && showFoundPrompt.slot.wishlistItemId) {
      markAsFound(showFoundPrompt.slot.wishlistItemId, showFoundPrompt.result.price, showFoundPrompt.slot.platform);
      refreshStats();
    }
    setShowFoundPrompt(null);
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      <AlarmOverlay
        activeAlarm={activeAlarm ? activeAlarm.result : null}
        slot={activeAlarm ? activeAlarm.slot : null}
        onDismiss={dismissAlarm}
      />

      {/* Mark as Found Prompt */}
      {showFoundPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700 max-w-md w-full mx-4 text-center shadow-2xl">
            <p className="text-lg text-white mb-2">Mark <span className="font-bold text-[#FFD700]">{showFoundPrompt.slot.carName}</span> as Found in your collection?</p>
            <p className="text-sm text-gray-400 mb-6">Price: {showFoundPrompt.result.price} · Platform: {showFoundPrompt.slot.platform}</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowFoundPrompt(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-colors">Not yet</button>
              <button onClick={handleMarkFound} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors">Yes, Found! 🏆</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-[#CC0000]">{stats.carsHunting}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Cars Hunting</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-green-400">{stats.foundToday}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Found Today</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-[#FFD700]">{stats.thSthFoundTotal}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">TH/STH Found</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-white">{stats.collectionSize}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Collection Size</p>
        </div>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1">Tracking Dashboard</h1>
          <p className="text-gray-400 text-sm">Slots 1 & 2 poll every 15s · Slots 3 & 4 poll every 10m</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-400">System Active</p>
          <span className="relative flex h-3 w-3 ml-auto mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slots.map(slot => (
          <SlotCard
            key={slot.slotId}
            slot={slot}
            result={results[slot.slotId] || null}
            onUpdateConfig={updateSlotConfig}
            onForceCheck={forceCheck}
            onAcknowledge={handleAcknowledge}
            isChecking={!!checkingState[slot.slotId]}
          />
        ))}
      </div>
    </div>
  );
}
