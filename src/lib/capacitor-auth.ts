import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const OAUTH_CALLBACK_PATH = '/auth/callback';
const NATIVE_CALLBACK_SCHEME = 'com.planext4u.customer';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}


export async function closeOAuthBrowser(): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await Browser.close();
  } catch {
    // Ignore browser-close failures when no external browser is open.
  }
}

export function isOAuthCallbackUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const scheme = url.protocol.replace(':', '');

    if (scheme === NATIVE_CALLBACK_SCHEME) {
      return url.hostname === 'auth' && url.pathname === '/callback';
    }

    return url.pathname === OAUTH_CALLBACK_PATH;
  } catch {
    return rawUrl.includes(`${NATIVE_CALLBACK_SCHEME}://auth/callback`) || rawUrl.includes(OAUTH_CALLBACK_PATH);
  }
}

export function extractOAuthResultFromUrl(rawUrl: string): {
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  try {
    const url = new URL(rawUrl);
    const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
    const getParam = (key: string) => hashParams.get(key) ?? url.searchParams.get(key);

    return {
      accessToken: getParam('access_token'),
      refreshToken: getParam('refresh_token'),
      error: getParam('error'),
      errorDescription: getParam('error_description'),
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      error: 'invalid_callback_url',
      errorDescription: 'Google sign-in could not be completed.',
    };
  }
}
