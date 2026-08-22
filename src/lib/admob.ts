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


/** Initialise the AdMob SDK and show the bottom banner (native only). */
export async function initAdMobBanner() {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  try {
    const { enabled, banner } = await loadConfig();
    if (!enabled || !banner) return;

    const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");
    await AdMob.initialize({ initializeForTesting: false });
    await AdMob.showBanner({
      adId: banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch {
    /* non-fatal — never block the app because ads failed */
  }
}

export async function hideAdMobBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
  } catch {
    /* non-fatal */
  }
}
