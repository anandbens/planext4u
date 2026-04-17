import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const capacitorStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },
};

const isNative = Capacitor.isNativePlatform();

/**
 * Persistent key/value store for cached profile data (admin_user, customer_user, vendor_user).
 * On native: writes to BOTH Capacitor Preferences (survives app kill) and localStorage (sync read for instant hydration).
 * On web: just localStorage.
 */
export const persistentStore = {
  async get(key: string): Promise<string | null> {
    // Try sync localStorage first for instant boot
    try {
      const local = localStorage.getItem(key);
      if (local) return local;
    } catch { /* ignore */ }
    if (isNative) {
      try {
        const { value } = await Preferences.get({ key });
        if (value) {
          // Re-hydrate localStorage so subsequent sync reads work
          try { localStorage.setItem(key, value); } catch { /* ignore */ }
        }
        return value;
      } catch { /* ignore */ }
    }
    return null;
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    if (isNative) {
      // Fire-and-forget; Preferences write is async but we don't need to await
      Preferences.set({ key, value }).catch(() => { /* ignore */ });
    }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    if (isNative) {
      Preferences.remove({ key }).catch(() => { /* ignore */ });
    }
  },
};
