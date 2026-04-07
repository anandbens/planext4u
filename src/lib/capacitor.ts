import { Capacitor } from '@capacitor/core';
import { App as CapacitorAppPlugin } from '@capacitor/app';

/**
 * Check if running inside a native Capacitor shell (Android/iOS)
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

/**
 * Cached app identity for the current native session
 */
let _cachedAppId: string | null = null;
let _appIdPromise: Promise<string | null> | null = null;

/**
 * Detect native app package ID (com.planext4u.vendor vs com.planext4u.customer)
 * Returns null on web.
 */
export async function getNativeAppId(): Promise<string | null> {
  if (!isNativePlatform()) return null;
  if (_cachedAppId) return _cachedAppId;
  if (_appIdPromise) return _appIdPromise;

  _appIdPromise = CapacitorAppPlugin.getInfo()
    .then(info => {
      _cachedAppId = info.id;
      return info.id;
    })
    .catch(() => null);

  return _appIdPromise;
}

/**
 * Returns true if running inside the vendor APK
 */
export async function isVendorApp(): Promise<boolean> {
  const appId = await getNativeAppId();
  return appId === 'com.planext4u.vendor';
}

/**
 * Synchronous check — only works after getNativeAppId() has resolved at least once.
 */
export function isVendorAppSync(): boolean {
  return _cachedAppId === 'com.planext4u.vendor';
}

/**
 * Safe area padding helper for native apps
 */
export const getSafeAreaStyle = (): React.CSSProperties => {
  if (!isNativePlatform()) return {};
  return {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  };
};
