import { Capacitor } from '@capacitor/core';

/**
 * Check if running inside a native Capacitor shell (Android/iOS)
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

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
