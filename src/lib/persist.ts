// Persistence layer - saves/loads data stores to/from localStorage
// Each store is keyed by a unique name

const STORAGE_PREFIX = 'app_db_';

export function loadStore<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to load store "${key}" from localStorage`, e);
  }
  return [...defaults];
}

export function saveStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save store "${key}" to localStorage`, e);
  }
}

export function resetAllStores(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

// Cart persistence
export function loadCart(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'cart');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveCart(items: any[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'cart', JSON.stringify(items));
  } catch {}
}

// Auth session persistence
export function loadSession(): { userId: string; role: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'session');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveSession(session: { userId: string; role: string } | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify(session));
    else localStorage.removeItem(STORAGE_PREFIX + 'session');
  } catch {}
}
