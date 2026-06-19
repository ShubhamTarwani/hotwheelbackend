import React from 'react';
import { ScrapeResult, SlotConfig, getTypeLabel } from '../lib/store';

interface AlarmOverlayProps {
  activeAlarm: ScrapeResult | null;
  slot: SlotConfig | null;
  onDismiss: () => void;
}

export default function AlarmOverlay({ activeAlarm, slot, onDismiss }: AlarmOverlayProps) {
  if (!activeAlarm || !slot) return null;

  const typeLabel = getTypeLabel(slot.carType);
  const carName = slot.carName || activeAlarm.productName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/90 backdrop-blur-sm">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl border-4 border-[#CC0000] max-w-lg w-full mx-4 text-center">
        <div className="w-20 h-20 bg-[#CC0000] rounded-full mx-auto flex items-center justify-center mb-6 animate-bounce">
          <span className="text-3xl">🔥</span>
        </div>

        <h2 className="text-3xl font-black text-[#FFD700] mb-1 uppercase tracking-wider">FOUND!</h2>
        <p className="text-sm text-gray-400 mb-4">Hot Wheels Alert</p>

        <div className="bg-gray-800 p-5 rounded-lg my-6 text-left space-y-2">
          <p className="text-2xl font-bold text-white">{carName}</p>
          <p className="text-sm">
            <span className="text-gray-400">Type: </span>
            <span className="font-bold text-amber-400">{typeLabel}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Platform: </span>
            <span className="font-bold text-white capitalize">{activeAlarm.storeName}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Price: </span>
            <span className="font-bold text-green-400 text-lg">{activeAlarm.price}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Pincode: </span>
            <span className="font-bold text-white">{slot.pincode}</span>
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="w-full bg-[#CC0000] hover:bg-red-700 text-white font-black text-xl py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(204,0,0,0.6)] transition-transform active:scale-95 uppercase tracking-widest"
        >
          Dismiss Alarm
        </button>
      </div>
    </div>
  );
}
