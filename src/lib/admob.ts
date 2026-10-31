/**
 * AdMob (native Android / iOS only) banner wiring.
 *
 * Config comes from `platform_variables` so ad units can be swapped without a
 * new APK:
 *   admob_enabled          -> "true" | "false" (defaults to true when an ad unit exists)
 *   admob_ad_unit_banner   -> "ca-app-pub-XXXXXXXX/YYYYYYYY"
 *
 * On the web this module is a no-op — AdSense (GoogleAdUnit) handles browsers.
 */
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;
let initializing: Promise<boolean> | null = null;
let bannerConsumers = 0;
let bannerGeneration = 0;

/** Approved production banner unit (fallback when the platform variable is unset). */
const APPROVED_BANNER_UNIT = "ca-app-pub-6006362146695296/8328252043";
/** Stale / retired banner units that must never be requested again. */
const STALE_BANNER_UNITS = new Set(["ca-app-pub-6006362146695296/4966935926"]);

async function loadConfig() {
  const { data } = await supabase
    .from("platform_variables")
    .select("key, value")
    .in("key", ["admob_enabled", "admob_ad_unit_banner"]);
  const map = new Map((data || []).map((r: any) => [r.key, String(r.value ?? "").trim()]));
  let banner = map.get("admob_ad_unit_banner") || "";
  if (!banner || STALE_BANNER_UNITS.has(banner)) banner = APPROVED_BANNER_UNIT;
  const enabledRaw = (map.get("admob_enabled") || "").toLowerCase();
  const enabled = enabledRaw ? enabledRaw === "true" : Boolean(banner);
  return { enabled, banner };
}


async function ensureAdMobInitialized(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (initialized) return true;
  if (initializing) return initializing;
  initializing = (async () => {
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: false });
      initialized = true;
      return true;
    } catch (error) {
      console.warn("[AdMob] initialization failed", error);
      return false;
    } finally {
      initializing = null;
    }
  })();
  return initializing;
}

/** Initialise the native SDK without displaying a global/fixed ad. */
export async function initAdMobBanner() {
  await ensureAdMobInitialized();
}

/**
 * Show the native banner only while an approved Google ad slot is mounted.
 * Multiple social-feed slots share one native banner and release it only when
 * the final slot leaves the screen.
 */
export async function acquireAdMobBanner() {
  if (!Capacitor.isNativePlatform()) return;
  bannerConsumers += 1;
  if (bannerConsumers !== 1) return;
  const requestGeneration = bannerGeneration;

  try {
    const [{ enabled, banner }, ready] = await Promise.all([loadConfig(), ensureAdMobInitialized()]);
    if (!ready || !enabled || !banner || bannerConsumers === 0) return;
    const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");
    await AdMob.showBanner({
      adId: banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
    // Navigation/scrolling may remove the slot while Google's async request is
    // still completing. Never allow that late response to leave a global ad.
    if (bannerConsumers === 0 || requestGeneration !== bannerGeneration) {
      await AdMob.hideBanner();
    }
  } catch (error) {
    console.warn("[AdMob] banner request failed", error);
  }
}

export async function releaseAdMobBanner() {
  if (!Capacitor.isNativePlatform()) return;
  bannerConsumers = Math.max(0, bannerConsumers - 1);
  if (bannerConsumers > 0) return;
  bannerGeneration += 1;
  await hideAdMobBanner();
}

/** Immediately invalidate all pending requests when leaving an approved ad route. */
export async function resetAdMobBanner() {
  if (!Capacitor.isNativePlatform()) return;
  bannerConsumers = 0;
  bannerGeneration += 1;
  await hideAdMobBanner();
}

export async function hideAdMobBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
  } catch (error) {
    console.warn("[AdMob] banner hide failed", error);
  }
}
