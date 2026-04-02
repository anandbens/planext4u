import { Capacitor } from '@capacitor/core';

/**
 * Get the appropriate OAuth redirect URI based on the current platform.
 */
export function getOAuthRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    // For Capacitor native apps, redirect back to the app via deep link
    return 'https://planext4u.lovable.app/auth/callback';
  }
  // For web (desktop & mobile browsers)
  return `${window.location.origin}/auth/callback`;
}

/**
 * Open Google OAuth in the system browser on native platforms.
 * On web, this is handled by the normal redirect flow.
 */
export async function openOAuthInSystemBrowser(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, windowName: '_system' });
  } else {
    // On web, just redirect
    window.location.href = url;
  }
}

/**
 * Set up deep link listener for Capacitor native apps.
 * Call this on app startup to handle OAuth callbacks.
 */
export function setupDeepLinkListener(callback: (url: string) => void): (() => void) | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;

  const handler = async () => {
    const { App: CapApp } = await import('@capacitor/core').then(m => ({ App: m.Capacitor }));
    // Use Capacitor App plugin for deep links
    try {
      const { App } = await import('@capacitor/app' as string);
      const listener = await App.addListener('appUrlOpen', (data: { url: string }) => {
        callback(data.url);
      });
      return () => listener.remove();
    } catch {
      console.warn('Capacitor App plugin not available');
      return undefined;
    }
  };

  // Execute async setup
  let cleanup: (() => void) | undefined;
  handler().then(c => { cleanup = c; });
  return () => cleanup?.();
}
