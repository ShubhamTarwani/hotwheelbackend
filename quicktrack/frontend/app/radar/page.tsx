'use client';

import React, { useEffect, useState } from 'react';
import RadarSVG from '../../components/RadarSVG';
import { SlotConfig, ScrapeResult, getSlots } from '../../lib/store';

export default function RadarPage() {
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [results, setResults] = useState<Record<number, ScrapeResult | null>>({});

  useEffect(() => {
    const syncState = () => {
      setSlots(getSlots());
    };
    syncState();
    const interval = setInterval(syncState, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-1 tracking-widest uppercase">
          <span className="text-[#FFD700]">HOT WHEELS</span>{' '}
          <span className="text-white">RADAR</span>
        </h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Scanning for stock drops</p>
      </div>

      <div className="w-full max-w-2xl">
        <RadarSVG slots={slots} results={results} />
      </div>

      <div className="mt-10 flex items-center space-x-6 text-[10px] uppercase tracking-widest text-gray-600">
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>In Stock</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Hunting (STH/TH)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <span>Hunting (Mainline)</span>
        </div>
      </div>
    </div>
  );
}
