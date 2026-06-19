// HW Tracker — Data model types and localStorage helpers

// ========== TYPES ==========

export type CarType = 'STH' | 'TH' | 'mainline' | 'any_drop';
export type HuntStatus = 'hunting' | 'found' | 'idle';

export const COLOR_DOT_OPTIONS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
] as const;

export interface WishlistItem {
  id: string;
  name: string;
  type: CarType;
  year?: string;
  series?: string;
  notes?: string;
  status: HuntStatus;
  colorDot: string;
  foundDate?: string;
  foundPrice?: string;
  foundPlatform?: string;
}

export interface SlotConfig {
  slotId: number;
  priority: boolean;
  wishlistItemId: string | null;
  searchQuery: string;
  platform: 'blinkit' | 'zepto' | 'instamart';
  pincode: string;
  lastStatus: 'in_stock' | 'out_of_stock' | 'unknown';
  lastChecked: number | null;
  lastPrice: string | null;
  carName: string;
  carType: CarType;
}

export interface ScrapeResult {
  inStock: boolean;
  price: string;
  productName: string;
  storeName: string;
  error?: string;
  lastChecked: number;
  acknowledged?: boolean;
}

// ========== STORAGE KEYS ==========

const WISHLIST_KEY = 'hw_wishlist';
const SLOTS_KEY = 'hw_slots';
const SETTINGS_KEY = 'hw_settings';
const ALERTS_KEY = 'hw_alerts';

// ========== DEFAULT SLOTS ==========

export const DEFAULT_SLOTS: SlotConfig[] = [
  { slotId: 1, priority: true, wishlistItemId: null, searchQuery: '', platform: 'blinkit', pincode: '', lastStatus: 'unknown', lastChecked: null, lastPrice: null, carName: '', carType: 'any_drop' },
  { slotId: 2, priority: true, wishlistItemId: null, searchQuery: '', platform: 'zepto', pincode: '', lastStatus: 'unknown', lastChecked: null, lastPrice: null, carName: '', carType: 'any_drop' },
  { slotId: 3, priority: false, wishlistItemId: null, searchQuery: '', platform: 'blinkit', pincode: '', lastStatus: 'unknown', lastChecked: null, lastPrice: null, carName: '', carType: 'any_drop' },
  { slotId: 4, priority: false, wishlistItemId: null, searchQuery: '', platform: 'zepto', pincode: '', lastStatus: 'unknown', lastChecked: null, lastPrice: null, carName: '', carType: 'any_drop' },
];

// ========== WISHLIST ==========

export function getWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(WISHLIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveWishlist(items: WishlistItem[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

export function addWishlistItem(item: WishlistItem): void {
  const list = getWishlist();
  list.push(item);
  saveWishlist(list);
}

export function updateWishlistItem(id: string, updates: Partial<WishlistItem>): void {
  const list = getWishlist();
  const index = list.findIndex(i => i.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    saveWishlist(list);
  }
}

export function removeWishlistItem(id: string): void {
  const list = getWishlist().filter(i => i.id !== id);
  saveWishlist(list);
}

export function markAsFound(id: string, price: string, platform: string): void {
  updateWishlistItem(id, {
    status: 'found',
    foundDate: new Date().toISOString(),
    foundPrice: price,
    foundPlatform: platform,
  });
}

// ========== SLOTS ==========

export function getSlots(): SlotConfig[] {
  if (typeof window === 'undefined') return DEFAULT_SLOTS;
  const raw = localStorage.getItem(SLOTS_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_SLOTS;
}

export function saveSlots(slots: SlotConfig[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function updateSlot(slotId: number, updates: Partial<SlotConfig>): void {
  const slots = getSlots();
  const index = slots.findIndex(s => s.slotId === slotId);
  if (index !== -1) {
    slots[index] = { ...slots[index], ...updates };
    saveSlots(slots);
  }
}

export function assignWishlistItemToSlot(wishlistItemId: string, slotId: number): void {
  const item = getWishlist().find(i => i.id === wishlistItemId);
  if (!item) return;

  updateSlot(slotId, {
    wishlistItemId: item.id,
    searchQuery: buildQuery(item.name, item.type),
    carName: item.name,
    carType: item.type,
  });

  // Mark the wishlist item as hunting
  updateWishlistItem(wishlistItemId, { status: 'hunting' });
}

// ========== SETTINGS ==========

export interface HWSettings {
  pincode: string;
  city: string;
  tgToken: string;
  tgChatId: string;
  twSid: string;
  twToken: string;
  twFrom: string;
  twTo: string;
  volume: number;
  autoLocation: boolean;
  enableInstamart: boolean;
  alertAnyDrop: boolean;
  defaultPincode: string;
}

export const DEFAULT_SETTINGS: HWSettings = {
  pincode: '',
  city: 'Delhi',
  tgToken: '',
  tgChatId: '',
  twSid: '',
  twToken: '',
  twFrom: '',
  twTo: '',
  volume: 100,
  autoLocation: true,
  enableInstamart: false,
  alertAnyDrop: false,
  defaultPincode: '',
};

export function getSettings(): HWSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export function saveSettings(settings: HWSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ========== ALERTS LOG ==========

export interface AlertLogEntry {
  timestamp: number;
  productName: string;
  carType: CarType;
  platform: string;
  pincode: string;
  price: string;
}

export function getAlertLogs(): AlertLogEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ALERTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addAlertLog(entry: AlertLogEntry): void {
  const logs = getAlertLogs();
  logs.unshift(entry);
  if (logs.length > 200) logs.pop();
  localStorage.setItem(ALERTS_KEY, JSON.stringify(logs));
}

export function clearAlertLogs(): void {
  localStorage.removeItem(ALERTS_KEY);
}

// ========== QUERY BUILDER ==========

export function buildQuery(name: string, type: CarType): string {
  if (type === 'STH') return 'hot wheels super treasure hunt';
  if (type === 'TH') return 'hot wheels treasure hunt';
  if (type === 'any_drop') return 'hot wheels mainline';
  return `hot wheels ${name}`;
}

// ========== STATS HELPERS ==========

export function getDashboardStats() {
  const wishlist = getWishlist();
  const today = new Date().toISOString().split('T')[0];

  return {
    carsHunting: wishlist.filter(w => w.status === 'hunting').length,
    foundToday: wishlist.filter(w => w.status === 'found' && w.foundDate?.startsWith(today)).length,
    thSthFoundTotal: wishlist.filter(w => w.status === 'found' && (w.type === 'TH' || w.type === 'STH')).length,
    collectionSize: wishlist.filter(w => w.status === 'found').length,
  };
}

export function getCollectionStats() {
  const found = getWishlist().filter(w => w.status === 'found');
  const totalSpent = found.reduce((sum, w) => {
    const price = parseFloat((w.foundPrice || '0').replace(/[^\d.]/g, ''));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  return {
    totalFound: found.length,
    sthCount: found.filter(w => w.type === 'STH').length,
    thCount: found.filter(w => w.type === 'TH').length,
    totalSpent,
  };
}

// ========== DEEP LINK HELPERS ==========

export function getStoreLink(platform: string, query: string): string {
  const encoded = encodeURIComponent(query);
  switch (platform.toLowerCase()) {
    case 'blinkit':
      return `https://blinkit.com/s/?q=${encoded}`;
    case 'zepto':
      return `https://www.zeptonow.com/search?query=${encoded}`;
    case 'instamart':
      return `https://www.swiggy.com/instamart/search?custom_back=true&query=${encoded}`;
    default:
      return '#';
  }
}

// ========== TYPE BADGE HELPERS ==========

export function getTypeBadgeStyle(type: CarType): string {
  switch (type) {
    case 'STH': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'TH': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'mainline': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'any_drop': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
}

export function getTypeLabel(type: CarType): string {
  switch (type) {
    case 'STH': return 'STH';
    case 'TH': return 'TH';
    case 'mainline': return 'Mainline';
    case 'any_drop': return 'Any Drop';
  }
}

// ========== BACKUP & RESTORE ==========

export function exportData(): string {
  if (typeof window === 'undefined') return '';
  const data = {
    wishlist: localStorage.getItem(WISHLIST_KEY),
    slots: localStorage.getItem(SLOTS_KEY),
    settings: localStorage.getItem(SETTINGS_KEY),
    alerts: localStorage.getItem(ALERTS_KEY),
  };
  return JSON.stringify(data);
}

export function importData(jsonData: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(jsonData);
    if (data.wishlist) localStorage.setItem(WISHLIST_KEY, data.wishlist);
    if (data.slots) localStorage.setItem(SLOTS_KEY, data.slots);
    if (data.settings) localStorage.setItem(SETTINGS_KEY, data.settings);
    if (data.alerts) localStorage.setItem(ALERTS_KEY, data.alerts);
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}
