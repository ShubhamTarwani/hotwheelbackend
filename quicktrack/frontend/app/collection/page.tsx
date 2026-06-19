'use client';

import React, { useState, useEffect } from 'react';
import { getWishlist, getCollectionStats, WishlistItem, getTypeBadgeStyle, getTypeLabel } from '../../lib/store';

export default function CollectionPage() {
  const [found, setFound] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState({ totalFound: 0, sthCount: 0, thCount: 0, totalSpent: 0 });

  useEffect(() => {
    const all = getWishlist();
    setFound(all.filter(w => w.status === 'found'));
    setStats(getCollectionStats());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 text-white">
      <h1 className="text-3xl font-black mb-2">My Collection</h1>
      <p className="text-gray-400 mb-8">Your trophy shelf — every Hot Wheels car you&apos;ve found</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-green-400">{stats.totalFound}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Total Found</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-amber-400">{stats.sthCount}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">STH Count</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-orange-400">{stats.thCount}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">TH Count</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-3xl font-black text-[#FFD700]">₹{stats.totalSpent.toLocaleString()}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Total Spent</p>
        </div>
      </div>

      {/* Collection Grid */}
      {found.length === 0 ? (
        <div className="bg-gray-800/50 p-12 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-lg">No cars found yet</p>
          <p className="text-gray-500 text-sm mt-1">When you find a car from your wishlist, it will appear here as a trophy</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {found.map(car => (
            <div key={car.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 border-l-4 border-l-green-500 hover:border-gray-600 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: car.colorDot }} />
                  <h3 className="font-bold text-white truncate">{car.name}</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${getTypeBadgeStyle(car.type)}`}>
                  {getTypeLabel(car.type)}
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                {car.foundDate && (
                  <div className="flex justify-between text-gray-400">
                    <span>Found</span>
                    <span className="text-white">{new Date(car.foundDate).toLocaleDateString()}</span>
                  </div>
                )}
                {car.foundPrice && (
                  <div className="flex justify-between text-gray-400">
                    <span>Price</span>
                    <span className="text-green-400 font-bold">{car.foundPrice}</span>
                  </div>
                )}
                {car.foundPlatform && (
                  <div className="flex justify-between text-gray-400">
                    <span>Platform</span>
                    <span className="text-white capitalize">{car.foundPlatform}</span>
                  </div>
                )}
                {car.year && (
                  <div className="flex justify-between text-gray-400">
                    <span>Year</span>
                    <span className="text-white">{car.year}</span>
                  </div>
                )}
                {car.series && (
                  <div className="flex justify-between text-gray-400">
                    <span>Series</span>
                    <span className="text-white">{car.series}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-700/50 text-center">
                <span className="text-green-400 text-xs font-bold uppercase tracking-widest">🏆 Found</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
