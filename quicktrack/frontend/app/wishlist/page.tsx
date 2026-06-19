'use client';

import React, { useState, useEffect } from 'react';
import {
  WishlistItem, CarType, HuntStatus, COLOR_DOT_OPTIONS,
  getWishlist, addWishlistItem, updateWishlistItem, removeWishlistItem,
  getSlots, assignWishlistItemToSlot,
  getTypeBadgeStyle, getTypeLabel,
} from '../../lib/store';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<CarType>('mainline');
  const [year, setYear] = useState('');
  const [series, setSeries] = useState('');
  const [notes, setNotes] = useState('');
  const [colorDot, setColorDot] = useState<string>(COLOR_DOT_OPTIONS[0]);

  useEffect(() => {
    setWishlist(getWishlist());
  }, []);

  const reload = () => setWishlist(getWishlist());

  const handleAdd = () => {
    if (!name.trim()) return;
    const item: WishlistItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      name: name.trim(),
      type,
      year: year || undefined,
      series: series || undefined,
      notes: notes || undefined,
      status: 'idle',
      colorDot,
    };
    addWishlistItem(item);
    reload();
    setShowForm(false);
    setName(''); setType('mainline'); setYear(''); setSeries(''); setNotes('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this car from your wishlist?')) {
      removeWishlistItem(id);
      reload();
    }
  };

  const handleAssignToSlot = (wishlistItemId: string, slotId: number) => {
    assignWishlistItemToSlot(wishlistItemId, slotId);
    reload();
    setAssigningId(null);
  };

  const handleStatusToggle = (item: WishlistItem) => {
    const nextStatus: HuntStatus = item.status === 'idle' ? 'hunting' : item.status === 'hunting' ? 'idle' : item.status;
    if (item.status !== 'found') {
      updateWishlistItem(item.id, { status: nextStatus });
      reload();
    }
  };

  const getStatusBadge = (status: HuntStatus) => {
    switch (status) {
      case 'hunting': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'found': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'idle': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusLabel = (status: HuntStatus) => {
    switch (status) {
      case 'hunting': return 'Hunting';
      case 'found': return 'Found 🏆';
      case 'idle': return 'Not Tracking';
    }
  };

  const slots = getSlots();

  return (
    <div className="max-w-4xl mx-auto py-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black">My Wishlist</h1>
          <p className="text-gray-400 mt-1">Track the Hot Wheels you&apos;re hunting for</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#CC0000] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg"
        >
          {showForm ? 'Cancel' : '+ Add Car'}
        </button>
      </div>

      {/* Add Car Form */}
      {showForm && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 animate-in">
          <h2 className="text-lg font-bold mb-4 text-[#FFD700]">Add to Wishlist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Car Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., '71 Datsun 510" className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select value={type} onChange={e => setType(e.target.value as CarType)} className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white">
                <option value="STH">Super Treasure Hunt (STH)</option>
                <option value="TH">Treasure Hunt (TH)</option>
                <option value="mainline">Mainline</option>
                <option value="any_drop">Any New Drop</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="2025" className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Series</label>
              <input type="text" value={series} onChange={e => setSeries(e.target.value)} placeholder="HW Turbo" className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this car..." className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white" />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Color Tag</label>
            <div className="flex space-x-2">
              {COLOR_DOT_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColorDot(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${colorDot === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button onClick={handleAdd} disabled={!name.trim()} className="w-full bg-[#CC0000] hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-colors">
            Add to Wishlist
          </button>
        </div>
      )}

      {/* Wishlist Items */}
      {wishlist.length === 0 ? (
        <div className="bg-gray-800/50 p-12 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-lg">Your wishlist is empty</p>
          <p className="text-gray-500 text-sm mt-1">Add Hot Wheels cars you want to hunt for</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlist.map(item => (
            <div key={item.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between group hover:border-gray-600 transition-colors">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Color Dot */}
                <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: item.colorDot }} />
                
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-bold text-white truncate">{item.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getTypeBadgeStyle(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    {item.year && <span>{item.year}</span>}
                    {item.series && <span>• {item.series}</span>}
                    {item.notes && <span>• {item.notes}</span>}
                    {item.status === 'found' && item.foundPrice && (
                      <span className="text-green-400">• {item.foundPrice} on {item.foundPlatform}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                {item.status !== 'found' && (
                  <>
                    <button
                      onClick={() => handleStatusToggle(item)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
                    >
                      {item.status === 'idle' ? 'Start Hunting' : 'Stop'}
                    </button>
                    <button
                      onClick={() => setAssigningId(assigningId === item.id ? null : item.id)}
                      className="text-xs bg-[#CC0000] hover:bg-red-700 px-3 py-1.5 rounded transition-colors font-bold"
                    >
                      Assign Slot
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-500 hover:text-red-400 px-2 py-1.5 transition-colors">✕</button>
              </div>

              {/* Slot Assignment Dropdown */}
              {assigningId === item.id && (
                <div className="absolute mt-20 right-8 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-2 z-20">
                  {slots.map(slot => (
                    <button
                      key={slot.slotId}
                      onClick={() => handleAssignToSlot(item.id, slot.slotId)}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-800 rounded transition-colors"
                    >
                      Slot {slot.slotId} {slot.priority ? '(Priority)' : '(Regular)'} — {slot.platform}
                      {slot.carName && <span className="text-gray-500 ml-2">({slot.carName})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
