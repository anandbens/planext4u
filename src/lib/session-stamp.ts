/**
 * Session stamp — enforces a 3-day rolling re-login window on top of Supabase's
 * own JWT refresh. Stored via the same persistent store as cached profiles, so
 * it survives app kill on Capacitor (Preferences) and tab close on web
 * (localStorage).
 *
 * Behaviour:
 *  - On every successful login (admin / customer / vendor) we stamp `now`.
 *  - On every cold start, if a cached profile exists AND the stamp is < 3 days
 *    old, we treat the session as still valid and render the app immediately —
 *    Supabase auto-refresh handles JWT renewal in the background.
 *  - Once the stamp is older than 3 days the user must re-authenticate.
 */
import { persistentStore } from "@/lib/storage-adapter";

const STAMP_KEY_PREFIX = "p4u_session_stamp_";
export const SESSION_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export type SessionPortal = "admin" | "customer" | "vendor";

export function stampSession(portal: SessionPortal): void {
  persistentStore.set(STAMP_KEY_PREFIX + portal, String(Date.now()));
}

export function clearSessionStamp(portal: SessionPortal): void {
  persistentStore.remove(STAMP_KEY_PREFIX + portal);
}

/**
 * Sync read — uses localStorage mirror that `persistentStore.set` keeps in
 * lockstep with Capacitor Preferences. Safe to call during the first React
 * render so we can avoid a redirect-to-login flash on cold start.
 */
export function isSessionStampValid(portal: SessionPortal): boolean {
  try {
    const raw = localStorage.getItem(STAMP_KEY_PREFIX + portal);
    if (!raw) return false;
    const stampedAt = parseInt(raw, 10);
    if (!Number.isFinite(stampedAt)) return false;
    return Date.now() - stampedAt < SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Async variant — falls back to Capacitor Preferences if localStorage hasn't
 * been hydrated yet (rare, but possible on a freshly killed iOS app).
 */
export async function isSessionStampValidAsync(portal: SessionPortal): Promise<boolean> {
  if (isSessionStampValid(portal)) return true;
  const raw = await persistentStore.get(STAMP_KEY_PREFIX + portal);
  if (!raw) return false;
  const stampedAt = parseInt(raw, 10);
  if (!Number.isFinite(stampedAt)) return false;
  return Date.now() - stampedAt < SESSION_MAX_AGE_MS;
}
