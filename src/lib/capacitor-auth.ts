import { Capacitor } from '@capacitor/core';

/**
 * Get the appropriate OAuth redirect URI based on the current platform.
 */
export function getOAuthRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://planext4u.lovable.app/auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
}
