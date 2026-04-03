import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const PUBLISHED_OAUTH_ORIGIN = 'https://planext4u.lovable.app';
const OAUTH_CALLBACK_PATH = '/auth/callback';
const NATIVE_CALLBACK_SCHEME = 'com.planext4u.customer';

function isLovableManagedHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.lovable.app') ||
    hostname.endsWith('.lovableproject.com')
  );
}

function getPublishedHost(): string {
  return new URL(PUBLISHED_OAUTH_ORIGIN).hostname;
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getOAuthRedirectUri(): string {
  if (typeof window === 'undefined') {
    return `${PUBLISHED_OAUTH_ORIGIN}${OAUTH_CALLBACK_PATH}`;
  }

  return isNativePlatform()
    ? `${PUBLISHED_OAUTH_ORIGIN}${OAUTH_CALLBACK_PATH}`
    : `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
}

export function shouldUsePublishedOAuthHost(): boolean {
  if (typeof window === 'undefined' || isNativePlatform()) {
    return true;
  }

  return !isLovableManagedHost(window.location.hostname);
}

export function getGoogleOAuthInitiateUrl(): string {
  const authOrigin =
    typeof window !== 'undefined' && !shouldUsePublishedOAuthHost()
      ? window.location.origin
      : PUBLISHED_OAUTH_ORIGIN;

  const params = new URLSearchParams({
    provider: 'google',
    redirect_uri: getOAuthRedirectUri(),
    prompt: 'select_account',
  });

  return `${authOrigin}/~oauth/initiate?${params.toString()}`;
}

export async function openGoogleOAuthInBrowser(): Promise<void> {
  await Browser.open({ url: getGoogleOAuthInitiateUrl() });
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

    return url.hostname === getPublishedHost() && url.pathname === OAUTH_CALLBACK_PATH;
  } catch {
    return rawUrl.includes(`${NATIVE_CALLBACK_SCHEME}://auth/callback`) || rawUrl.includes(`${PUBLISHED_OAUTH_ORIGIN}${OAUTH_CALLBACK_PATH}`);
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
