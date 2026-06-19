'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sendTelegramMessage, sendTwilioWhatsApp } from '../../lib/notify';
import { getSettings, saveSettings, HWSettings, DEFAULT_SETTINGS, exportData, importData } from '../../lib/store';

export default function SettingsPage() {
  const [config, setConfig] = useState<HWSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConfig(getSettings());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'range' ? parseInt(value) : value
    }));
  };

  const handleSave = () => {
    saveSettings(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testTg = async () => {
    const success = await sendTelegramMessage(config.tgToken, config.tgChatId, '🔥 HW Tracker Test Message');
    alert(success ? 'Telegram Test Successful!' : 'Telegram Test Failed. Check console.');
  };

  const testTw = async () => {
    const success = await sendTwilioWhatsApp(config.twSid, config.twToken, config.twFrom, config.twTo, '🔥 HW Tracker Test Message');
    alert(success ? 'WhatsApp Test Successful!' : 'WhatsApp Test Failed. Check console.');
  };

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hw_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importData(content)) {
        alert('Data imported successfully! The page will now reload.');
        window.location.reload();
      } else {
        alert('Failed to import data. Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 text-white">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        {/* Location */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-[#FFD700]">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Default Pincode</label>
              <input type="text" name="defaultPincode" value={config.defaultPincode} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" maxLength={6} disabled={config.autoLocation} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">My City</label>
              <select name="city" value={config.city} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" disabled={config.autoLocation}>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Nagpur">Nagpur</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <input type="checkbox" name="autoLocation" checked={config.autoLocation} onChange={handleChange} className="w-4 h-4 rounded accent-[#CC0000]" />
            <label className="text-sm">Enable Auto Location Detection</label>
          </div>
        </section>

        {/* Hot Wheels Specific */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 border-l-4 border-l-[#CC0000]">
          <h2 className="text-xl font-semibold mb-4 text-[#FFD700]">Hot Wheels Tracking</h2>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="alertAnyDrop" checked={config.alertAnyDrop} onChange={handleChange} className="w-4 h-4 rounded accent-[#CC0000]" />
            <label className="text-sm">Alert me for <span className="font-bold text-white">any Hot Wheels drop</span></label>
          </div>
          <p className="text-xs text-gray-500 mt-2">When ON, Slot 4 will automatically monitor &quot;hot wheels mainline&quot; for new arrivals.</p>
        </section>

        {/* Alarm */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-[#FFD700]">Alarm System</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Volume ({config.volume}%)</label>
            <input type="range" name="volume" min="0" max="100" value={config.volume} onChange={handleChange} className="w-full accent-[#CC0000]" />
          </div>
        </section>

        {/* Telegram */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-400">Telegram Bot</h2>
            <button onClick={testTg} className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">Test</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bot Token</label>
              <input type="password" name="tgToken" value={config.tgToken} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Chat ID</label>
              <input type="text" name="tgChatId" value={config.tgChatId} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
          </div>
        </section>

        {/* Twilio */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-green-500">Twilio WhatsApp Sandbox</h2>
            <button onClick={testTw} className="text-sm bg-green-600 hover:bg-green-700 px-3 py-1 rounded">Test</button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account SID</label>
              <input type="password" name="twSid" value={config.twSid} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Auth Token</label>
              <input type="password" name="twToken" value={config.twToken} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">From Number</label>
              <input type="text" name="twFrom" value={config.twFrom} onChange={handleChange} placeholder="whatsapp:+14155238886" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">To Number</label>
              <input type="text" name="twTo" value={config.twTo} onChange={handleChange} placeholder="whatsapp:+91..." className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" />
            </div>
          </div>
        </section>

        {/* Experimental */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 border-l-4 border-l-orange-500">
          <h2 className="text-xl font-semibold mb-2 text-orange-400">Experimental Features</h2>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="enableInstamart" checked={config.enableInstamart} onChange={handleChange} className="w-4 h-4 rounded accent-orange-500" />
            <label className="text-sm">Enable Instamart Tracking <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs ml-2">BETA</span></label>
          </div>
          <p className="text-xs text-gray-500 mt-2">Instamart scraping may be unstable due to Akamai protections.</p>
        </section>

        {/* Data Backup */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-[#FFD700]">Data Backup</h2>
          <p className="text-sm text-gray-400 mb-4">Export your wishlist, collection, and settings to a JSON file. You can import this file later if you change devices or clear your browser data.</p>
          <div className="flex space-x-4">
            <button onClick={handleExport} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition-colors">
              Export Backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition-colors">
              Import Backup
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full bg-[#CC0000] hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
