import { Capacitor } from '@capacitor/core';

const PUBLISHED_OAUTH_ORIGIN = 'https://planext4u.lovable.app';

function isLovableManagedHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.lovable.app') ||
    hostname.endsWith('.lovableproject.com')
  );
}

/**
 * Get the appropriate OAuth redirect URI based on the current platform.
 */
export function getOAuthRedirectUri(): string {
  if (typeof window === 'undefined') {
    return `${PUBLISHED_OAUTH_ORIGIN}/auth/callback`;
  }

  return `${window.location.origin}/auth/callback`;
}

/**
 * Custom domains do not expose the managed /~oauth route, so Google OAuth
 * must be initiated from the published Lovable domain while still returning
 * the user to the current app domain's callback route.
 */
export function shouldUsePublishedOAuthHost(): boolean {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) {
    return false;
  }

  return !isLovableManagedHost(window.location.hostname);
}

export function getGoogleOAuthInitiateUrl(): string {
  const authOrigin =
    typeof window !== 'undefined' && shouldUsePublishedOAuthHost()
      ? PUBLISHED_OAUTH_ORIGIN
      : (typeof window !== 'undefined' ? window.location.origin : PUBLISHED_OAUTH_ORIGIN);

  const params = new URLSearchParams({
    provider: 'google',
    redirect_uri: getOAuthRedirectUri(),
    prompt: 'select_account',
  });

  return `${authOrigin}/~oauth/initiate?${params.toString()}`;
}
