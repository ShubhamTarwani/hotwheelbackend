import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HW Tracker | Hot Wheels Availability Monitor",
  description: "Track Hot Wheels availability across Blinkit, Zepto, and Instamart",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-[#0B0C10] via-[#11131A] to-[#1F2833] text-white min-h-screen flex flex-col`}>
        {/* Top Navigation Bar */}
        <header className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <a href="/" className="flex items-baseline space-x-1.5 group">
                <span className="text-xl font-black bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-md group-hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all duration-300 tracking-wider">HOT WHEELS</span>
                <span className="text-sm font-bold text-gray-300 tracking-widest group-hover:text-white transition-colors">TRACKER</span>
              </a>
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Dashboard</a>
                <a href="/wishlist" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Wishlist</a>
                <a href="/collection" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Collection</a>
                <a href="/radar" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Radar</a>
                <a href="/alerts" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Alerts</a>
                <a href="/settings" className="text-sm font-medium text-gray-400 hover:text-[#FFD700] hover:drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] transition-all duration-300">Settings</a>
              </nav>
            </div>

            {/* Location Display */}
            <a href="/settings" className="flex items-center space-x-2 text-sm text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <svg className="w-4 h-4 text-[#FFD700] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span id="global-location-display" className="font-medium">Initializing...</span>
            </a>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex space-x-2 px-4 pb-3 overflow-x-auto border-t border-white/5 pt-2 mt-2">
            <a href="/" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Dashboard</a>
            <a href="/wishlist" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Wishlist</a>
            <a href="/collection" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Collection</a>
            <a href="/radar" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Radar</a>
            <a href="/alerts" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Alerts</a>
            <a href="/settings" className="text-xs font-medium text-gray-400 hover:text-[#FFD700] px-2 py-1 whitespace-nowrap transition-colors">Settings</a>
          </div>
        </header>

        <main className="flex-grow p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
