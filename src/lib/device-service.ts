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
  try {
    if (isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") return null;
      const pos = await Geolocation.getCurrentPosition({ timeout: 10000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }

    // Web fallback
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  } catch {
    return null;
  }
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
        allMatched.push(...(data as unknown as MatchedUser[]));
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
