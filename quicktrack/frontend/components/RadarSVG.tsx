'use client';

import React, { useEffect, useRef } from 'react';
import { SlotConfig, ScrapeResult } from '../lib/store';

interface RadarProps {
  slots: SlotConfig[];
  results: Record<number, ScrapeResult | null>;
}

export default function RadarSVG({ slots, results }: RadarProps) {
  const sweepRef = useRef<SVGLineElement>(null);
  const angleRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      angleRef.current = (angleRef.current + 1.5) % 360;
      if (sweepRef.current) {
        sweepRef.current.setAttribute('transform', `rotate(${angleRef.current} 200 200)`);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const getBlipPosition = (index: number) => {
    const positions = [
      { x: 120, y: 110 },
      { x: 280, y: 110 },
      { x: 120, y: 280 },
      { x: 280, y: 280 },
    ];
    return positions[index] || { x: 200, y: 200 };
  };

  const getBlipColor = (slot: SlotConfig, result: ScrapeResult | null) => {
    if (result?.inStock) return '#22c55e'; // green pulse
    if (slot.carType === 'STH' || slot.carType === 'TH') return '#ef4444'; // red for hunting STH/TH
    return '#6b7280'; // gray for hunting mainline
  };

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-lg mx-auto drop-shadow-[0_0_40px_rgba(20,83,45,0.5)]">
      {/* Background circle */}
      <circle cx="200" cy="200" r="195" fill="#0a0a0a" stroke="#1a3a1a" strokeWidth="3" />

      {/* Grid rings */}
      <circle cx="200" cy="200" r="150" fill="none" stroke="#1a3a1a" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="100" fill="none" stroke="#1a3a1a" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="50" fill="none" stroke="#1a3a1a" strokeWidth="0.5" />

      {/* Crosshairs */}
      <line x1="5" y1="200" x2="395" y2="200" stroke="#1a3a1a" strokeWidth="0.5" />
      <line x1="200" y1="5" x2="200" y2="395" stroke="#1a3a1a" strokeWidth="0.5" />

      {/* Sweep line */}
      <line ref={sweepRef} x1="200" y1="200" x2="200" y2="10" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="2" />

      {/* Center — Hot Wheels text */}
      <text x="200" y="190" textAnchor="middle" className="font-black" fill="#FFD700" fontSize="16" letterSpacing="2">HOT WHEELS</text>
      <text x="200" y="210" textAnchor="middle" className="font-bold" fill="#888" fontSize="10" letterSpacing="4">TRACKER</text>

      {/* Blips */}
      {slots.map((slot, index) => {
        if (!slot.carName && !slot.searchQuery) return null;
        const result = results[slot.slotId];
        const pos = getBlipPosition(index);
        const color = getBlipColor(slot, result);
        const isInStock = result?.inStock;

        return (
          <g key={slot.slotId}>
            {/* Pulse ring for in-stock */}
            {isInStock && (
              <circle cx={pos.x} cy={pos.y} r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.5">
                <animate attributeName="r" from="6" to="18" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Blip dot */}
            <circle cx={pos.x} cy={pos.y} r="5" fill={color}>
              {isInStock && (
                <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Labels */}
            <text x={pos.x} y={pos.y + 18} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">
              {(slot.carName || slot.searchQuery || '').substring(0, 14)}
            </text>
            <text x={pos.x} y={pos.y + 28} textAnchor="middle" fill="#555" fontSize="7" style={{ textTransform: 'uppercase' }}>
              {slot.platform}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
