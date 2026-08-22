/**
 * Pure helpers for advertisement injection in the Socio feed.
 *
 * Rule: exactly one ad unit is rendered after every N organic posts
 * (posts 1-5, then an ad; posts 6-10, then an ad; ...), and two ad units
 * must never render consecutively.
 */

/** Exactly one ad unit is inserted after every N organic feed posts. */
export const FEED_AD_INTERVAL = 5;

export interface FeedAdSlotInput {
  /** Number of platform (internal) ads available for this placement. */
  platformAdCount: number;
  /** Whether a Google ad unit would actually render (enabled + valid slot id). */
  googleAdsActive: boolean;
}

export interface FeedAdSlotResult {
  /** True when an ad should be rendered after the post at this index. */
  isAdSlot: boolean;
  /** Zero-based ad slot number (slot 0 comes after post 5). */
  slot: number;
  /** Index into the platform ads array, or null when no platform ad renders. */
  platformAdIndex: number | null;
  /** True when a Google ad unit renders at this position. */
  showGoogleAd: boolean;
}

/**
 * Decide what (if anything) renders after the post at `index`.
 * At most one of `platformAdIndex` / `showGoogleAd` is ever set.
 */
export function resolveFeedAdSlot(
  index: number,
  { platformAdCount, googleAdsActive }: FeedAdSlotInput,
): FeedAdSlotResult {
  const isAdSlot = (index + 1) % FEED_AD_INTERVAL === 0;
  const slot = Math.floor(index / FEED_AD_INTERVAL);

  if (!isAdSlot) {
    return { isAdSlot: false, slot, platformAdIndex: null, showGoogleAd: false };
  }

  const hasPlatformAd = platformAdCount > 0;
  // Alternate platform and Google units across slots; fall back to whichever
  // source is available so an ad position is never left empty.
  const showGoogleAd = googleAdsActive && (slot % 2 === 1 || !hasPlatformAd);
  const platformAdIndex = !showGoogleAd && hasPlatformAd ? slot % platformAdCount : null;

  return { isAdSlot: true, slot, platformAdIndex, showGoogleAd };
}
