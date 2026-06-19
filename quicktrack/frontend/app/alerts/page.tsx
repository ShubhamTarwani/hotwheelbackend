'use client';

import React, { useEffect, useState } from 'react';
import { AlertLogEntry, getAlertLogs, clearAlertLogs, getTypeBadgeStyle, getTypeLabel } from '../../lib/store';

export default function AlertsPage() {
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);

  useEffect(() => {
    setLogs(getAlertLogs());
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all alert logs?')) {
      clearAlertLogs();
      setLogs([]);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Date', 'Time', 'Product', 'Type', 'Platform', 'Pincode', 'Price'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => {
        const d = new Date(log.timestamp);
        return [
          d.toLocaleDateString(),
          d.toLocaleTimeString(),
          `"${log.productName.replace(/"/g, '""')}"`,
          log.carType,
          log.platform,
          log.pincode,
          `"${log.price}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hw_tracker_alerts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Alerts Log</h1>
        <div className="space-x-4">
          <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors disabled:opacity-50" disabled={logs.length === 0}>
            Export CSV
          </button>
          <button onClick={handleClear} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors disabled:opacity-50" disabled={logs.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No alerts logged yet. When a Hot Wheels car is found in stock, it will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs uppercase border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Car</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Platform</th>
                  <th className="px-6 py-4 font-semibold">Pincode</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {log.productName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getTypeBadgeStyle(log.carType)}`}>
                        {getTypeLabel(log.carType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${log.platform === 'blinkit' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                        ${log.platform === 'zepto' ? 'bg-purple-600/20 text-purple-400' : ''}
                        ${log.platform === 'instamart' ? 'bg-orange-500/20 text-orange-400' : ''}
                      `}>
                        {log.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{log.pincode}</td>
                    <td className="px-6 py-4 font-bold text-green-400">{log.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
