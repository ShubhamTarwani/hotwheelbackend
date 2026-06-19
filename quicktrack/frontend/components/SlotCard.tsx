'use client';

import React, { useState } from 'react';
import { SlotConfig, ScrapeResult, CarType, getTypeBadgeStyle, getTypeLabel, getStoreLink, buildQuery } from '../lib/store';

interface SlotCardProps {
  slot: SlotConfig;
  result: ScrapeResult | null;
  onUpdateConfig: (config: SlotConfig) => void;
  onForceCheck: (id: number) => void;
  onAcknowledge?: (id: number) => void;
  isChecking: boolean;
}

export default function SlotCard({ slot, result, onUpdateConfig, onForceCheck, onAcknowledge, isChecking }: SlotCardProps) {
  const [isEditing, setIsEditing] = useState(!slot.searchQuery && !slot.carName);
  const [tempSlot, setTempSlot] = useState(slot);

  const handleSave = () => {
    const query = tempSlot.searchQuery || buildQuery(tempSlot.carName, tempSlot.carType);
    onUpdateConfig({ ...tempSlot, searchQuery: query });
    setIsEditing(false);
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'blinkit': return 'bg-yellow-500';
      case 'zepto': return 'bg-purple-600';
      case 'instamart': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const borderStyle = (result?.inStock && !result?.acknowledged)
    ? 'border-l-4 border-l-[#22a85a]'
    : slot.priority
    ? 'border-l-4 border-l-[#CC0000]'
    : '';

  return (
    <div className={`bg-white/5 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/10 flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 transition-all duration-300 ${borderStyle}`}>
      {/* Top Badges */}
      <div className="absolute top-0 right-0 flex">
        {slot.priority && (
          <span className="bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md">
            PRIORITY
          </span>
        )}
        <span className={`text-white text-[10px] font-bold px-3 py-1 shadow-md ${slot.priority ? '' : 'rounded-bl-xl'} ${getPlatformColor(slot.platform)}`}>
          {slot.platform.toUpperCase()}
        </span>
      </div>

      <div className="flex justify-between items-start mb-4 mt-2">
        <h3 className="text-lg font-black text-white/90 tracking-wide">Slot {slot.slotId}</h3>
        {!isEditing && (
          <button onClick={() => { setTempSlot(slot); setIsEditing(true); }} className="text-gray-400 hover:text-[#FFD700] text-xs font-medium transition-colors bg-white/5 px-2 py-1 rounded hover:bg-white/10">Edit</button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 flex-grow">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide">CAR NAME</label>
            <input
              type="text"
              className="w-full bg-black/40 border border-white/10 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] rounded-lg p-2.5 text-sm text-white transition-all outline-none"
              value={tempSlot.carName}
              onChange={e => setTempSlot({ ...tempSlot, carName: e.target.value })}
              placeholder="e.g., '71 Datsun 510"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide">TYPE</label>
              <select
                className="w-full bg-black/40 border border-white/10 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] rounded-lg p-2.5 text-sm text-white transition-all outline-none appearance-none"
                value={tempSlot.carType}
                onChange={e => setTempSlot({ ...tempSlot, carType: e.target.value as CarType })}
              >
                <option value="STH">STH</option>
                <option value="TH">TH</option>
                <option value="mainline">Mainline</option>
                <option value="any_drop">Any Drop</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide">PLATFORM</label>
              <select
                className="w-full bg-black/40 border border-white/10 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] rounded-lg p-2.5 text-sm text-white transition-all outline-none appearance-none"
                value={tempSlot.platform}
                onChange={e => setTempSlot({ ...tempSlot, platform: e.target.value as any })}
              >
                <option value="blinkit">Blinkit</option>
                <option value="zepto">Zepto</option>
                <option value="instamart">Instamart</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 tracking-wide">PINCODE</label>
            <input
              type="text"
              maxLength={6}
              className="w-full bg-black/40 border border-white/10 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] rounded-lg p-2.5 text-sm text-white transition-all outline-none"
              value={tempSlot.pincode}
              onChange={e => setTempSlot({ ...tempSlot, pincode: e.target.value })}
            />
          </div>
          <button onClick={handleSave} className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white p-3 rounded-lg text-sm font-bold mt-4 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all">
            Save Configuration
          </button>
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-between">
          <div>
            {/* Car Name & Type Badge */}
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <p className="text-xl font-black text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">{slot.carName || 'Not configured'}</p>
              {slot.carType && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 shadow-sm ${getTypeBadgeStyle(slot.carType)}`}>
                  {getTypeLabel(slot.carType)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4 font-medium flex items-center space-x-1">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>{slot.pincode || 'No Location'}</span>
            </p>

            {result ? (
              <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${(result.inStock && !result.acknowledged) ? 'bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.9)] animate-pulse' : 'bg-red-500/50'}`}></div>
                  <span className={`text-sm font-black tracking-wide ${(result.inStock && !result.acknowledged) ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'text-red-400/80'}`}>
                    {(result.inStock && !result.acknowledged) ? 'IN STOCK' : result.acknowledged ? 'IGNORED (WAITING FOR NEW)' : 'OUT OF STOCK'}
                  </span>
                </div>
                {(result.inStock && !result.acknowledged) && (
                  <>
                    <p className="text-sm text-gray-400">Price: <span className="font-bold text-[#FFD700] text-base">{result.price}</span></p>
                    <a
                      href={getStoreLink(slot.platform, slot.searchQuery || buildQuery(slot.carName, slot.carType))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onAcknowledge && onAcknowledge(slot.slotId)}
                      className="inline-flex items-center space-x-1 mt-1 text-xs bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                    >
                      <span>Grab it now</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </>
                )}
                {result.error && <p className="text-xs text-red-400/80 truncate font-mono bg-red-900/20 p-1 rounded" title={result.error}>{result.error}</p>}
                <p className="text-[10px] text-gray-500 font-medium">Checked: {new Date(result.lastChecked).toLocaleTimeString()}</p>
              </div>
            ) : (
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-400 font-medium tracking-wide">AWAITING SCAN...</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onForceCheck(slot.slotId)}
            disabled={isChecking || (!slot.searchQuery && !slot.carName)}
            className={`w-full mt-5 p-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${isChecking ? 'bg-white/5 text-gray-500 border border-white/5' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg hover:shadow-xl'}`}
          >
            {isChecking ? 'SCANNING...' : 'FORCE SCAN'}
          </button>
        </div>
      )}
    </div>
  );
}
