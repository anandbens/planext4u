/**
 * Device Service – reusable module for Contacts, Location, Push Notifications
 * Uses Capacitor plugins on native, graceful fallbacks on web.
 */
import { isNativePlatform } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";

// ─── CONTACTS ────────────────────────────────────────────

export interface DeviceContact {
  name: string;
  phone: string; // normalized +91XXXXXXXXXX
}

function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+91${digits.slice(3)}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return null;
}

export async function getContacts(): Promise<string[]> {
  if (!isNativePlatform()) return [];

  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const permission = await Contacts.requestPermissions();
    if (permission.contacts !== "granted") return [];

    const result = await Contacts.getContacts({
      projection: { name: true, phones: true },
    });

    const seen = new Set<string>();
    const phones: string[] = [];

    for (const c of result.contacts) {
      if (!c.phones) continue;
      for (const p of c.phones) {
        if (!p.number) continue;
        const normalized = normalizeIndianPhone(p.number);
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          phones.push(normalized);
        }
      }
    }

    return phones;
  } catch (err) {
    console.error("getContacts error:", err);
    return [];
  }
}

// ─── LOCATION ────────────────────────────────────────────

export interface DeviceLocation {
  lat: number;
  lng: number;
}

export async function getLocation(): Promise<DeviceLocation | null> {
  if (isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      const err: any = new Error("Location permission was denied. Please enable it in your phone's app settings, then retry.");
      err.code = "PERMISSION_DENIED";
      throw err;
    }

    // Strategy: race a high-accuracy GPS read against progressively relaxed
    // fallbacks so we always return real GPS coords when GPS is on, even
    // when the first fix takes a while. We try up to 3 strategies in order.
    const strategies: Array<{ enableHighAccuracy: boolean; timeout: number; maximumAge: number; label: string }> = [
      { enableHighAccuracy: true,  timeout: 20000, maximumAge: 0,           label: "fresh-gps" },
      { enableHighAccuracy: true,  timeout: 25000, maximumAge: 60_000,      label: "recent-gps" },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000,  label: "network-or-cached" },
    ];

    let lastError: any = null;
    for (const s of strategies) {
      try {
        console.log(`[device-service] GPS attempt: ${s.label}`);
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: s.enableHighAccuracy,
          timeout: s.timeout,
          maximumAge: s.maximumAge,
        });
        console.log(`[device-service] GPS success (${s.label}):`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e: any) {
        console.warn(`[device-service] GPS attempt failed (${s.label}):`, e?.message || e);
        lastError = e;
      }
    }

    const raw = String(lastError?.message || "").toLowerCase();
    const friendly =
      raw.includes("location services") || raw.includes("disabled") || raw.includes("kclerror")
        ? "Location services (GPS) are turned off on your phone. Open your phone's Settings → Location and turn it ON, then retry."
        : raw.includes("timeout")
          ? "Couldn't get a GPS fix in time. Step near a window or outside, wait a few seconds, then retry."
          : `Unable to read your location (${lastError?.message || "unknown error"}).`;
    const err: any = new Error(friendly);
    err.code = "POSITION_UNAVAILABLE";
    throw err;
  }

  // Web fallback — surface the actual browser error reason.
  return await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err: any = new Error("This browser does not support location services.");
      err.code = "UNSUPPORTED";
      reject(err);
      return;
    }
    const isSecure = window.isSecureContext || window.location.hostname === "localhost";
    if (!isSecure) {
      const err: any = new Error("Location requires a secure (https) connection.");
      err.code = "INSECURE_ORIGIN";
      reject(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (geoErr) => {
        const map: Record<number, { code: string; msg: string }> = {
          1: { code: "PERMISSION_DENIED", msg: "Location permission was blocked by the browser. Tap the lock icon in the address bar, allow Location, then retry." },
          2: { code: "POSITION_UNAVAILABLE", msg: "Your device couldn't determine its position. Check that GPS / Location services are enabled." },
          3: { code: "TIMEOUT", msg: "Getting your location took too long. Move to a spot with better signal and retry." },
        };
        const info = map[geoErr.code] || { code: "UNKNOWN", msg: geoErr.message || "Could not read your location." };
        const err: any = new Error(info.msg);
        err.code = info.code;
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  });
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────

export async function registerPush(userId: string): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return null;

    await PushNotifications.register();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      PushNotifications.addListener("registration", async (token) => {
        clearTimeout(timeout);
        // Save token to backend
        await supabase.rpc("save_device_token", {
          _user_id: userId,
          _token: token.value,
          _platform: "android",
        });
        resolve(token.value);
      });

      PushNotifications.addListener("registrationError", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (err) {
    console.error("registerPush error:", err);
    return null;
  }
}

// ─── CONTACT MATCHING (FIND FRIENDS) ────────────────────

export interface MatchedUser {
  id: string;
  name: string;
  mobile: string;
  profile_photo: string | null;
  source?: "contacts" | "friends_of_friends";
  mutual_count?: number;
}

export async function findFriends(): Promise<MatchedUser[]> {
  const phones = await getContacts();
  if (phones.length === 0) return [];

  try {
    // Send in batches of 100
    const allMatched: MatchedUser[] = [];
    for (let i = 0; i < phones.length; i += 100) {
      const batch = phones.slice(i, i + 100);
      const { data, error } = await supabase.rpc("match_contacts_by_phone", {
        _phones: batch,
      });
      if (!error && data) {
        allMatched.push(...(data as unknown as MatchedUser[]).map((u) => ({ ...u, source: "contacts" as const })));
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return allMatched.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  } catch (err) {
    console.error("findFriends error:", err);
    return [];
  }
}

// ─── FRIENDS OF FRIENDS ─────────────────────────────────

export interface FriendOfFriend {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  mutual_count: number;
}

export async function getFriendsOfFriends(userId: string, limit = 10): Promise<FriendOfFriend[]> {
  try {
    const { data, error } = await supabase.rpc("get_friends_of_friends", {
      _user: userId,
      _limit: limit,
    });
    if (error) {
      console.error("getFriendsOfFriends error:", error);
      return [];
    }
    return (data || []) as FriendOfFriend[];
  } catch (err) {
    console.error("getFriendsOfFriends error:", err);
    return [];
  }
}
