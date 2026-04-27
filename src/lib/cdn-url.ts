/**
 * Synchronous CDN URL rewriter.
 *
 * Rewrites direct Backblaze URLs (and the older Backblaze friendly URL form)
 * to our Cloudflare CDN host so every <img>, <video>, background-image, etc.
 * is served from the edge — no async signing, no hooks needed.
 *
 * This is a lightweight safety net layered on top of:
 *   1. The DB migration that already rewrote stored URLs to CDN.
 *   2. The `b2-presigned-upload` edge function that already returns CDN URLs.
 *   3. `<SmartImage>` / `resolveB2Url` for private-bucket signing.
 *
 * Use this anywhere we render a stored image URL with a plain <img>.
 */

/**
 * Public media base. We serve images via Vercel (www.planext4u.net) which
 * rewrites `/media-library/<key>` to the Backblaze public bucket. Cloudflare
 * sits in front of Vercel and caches the responses, so we get edge caching
 * without enabling Cloudflare proxy on the www DNS record (which would break
 * Vercel SSL / origin handshake).
 */
const CDN_BASE = "https://www.planext4u.net/media-library";

/** Legacy bases we still need to rewrite away from. */
const LEGACY_CDN_HOSTS = [
  "https://cdn.planext4u.com/",
  "https://cdn.planext4u.net/",
];

const BACKBLAZE_FRIENDLY = /^https?:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+\//i;
const BACKBLAZE_S3 = /^https?:\/\/s3\.[^.]+\.backblazeb2\.com\/[^/]+\//i;

/**
 * Rewrite any known Backblaze / legacy CDN URL form to the Vercel-fronted
 * media-library path. Returns the input unchanged for unrelated URLs.
 */
export function toCdnUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Already on the new media-library path
  if (trimmed.startsWith(CDN_BASE + "/")) {
    return trimmed;
  }

  // Legacy Cloudflare CDN hosts → rewrite to /media-library/
  for (const legacy of LEGACY_CDN_HOSTS) {
    if (trimmed.startsWith(legacy)) {
      return `${CDN_BASE}/${trimmed.slice(legacy.length)}`;
    }
  }

  // Backblaze friendly URL: https://f005.backblazeb2.com/file/<bucket>/<key>
  if (BACKBLAZE_FRIENDLY.test(trimmed)) {
    return trimmed.replace(BACKBLAZE_FRIENDLY, `${CDN_BASE}/`);
  }

  // Backblaze S3 endpoint: https://s3.us-east-005.backblazeb2.com/<bucket>/<key>
  if (BACKBLAZE_S3.test(trimmed)) {
    return trimmed.replace(BACKBLAZE_S3, `${CDN_BASE}/`);
  }

  return trimmed;
}
