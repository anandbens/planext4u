import { Capacitor } from '@capacitor/core';

/**
 * Get the appropriate OAuth redirect URI based on the current platform.
 */
export function getOAuthRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    // For Capacitor native apps, redirect to the published URL which will deep-link back
    return 'https://planext4u.lovable.app/auth/callback';
  }
  // For web (desktop & mobile browsers)
  return `${window.location.origin}/auth/callback`;
}
