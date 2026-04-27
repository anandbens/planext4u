/**
 * Synchronous CDN URL rewriter.
 *
 * Rewrites direct Backblaze URLs and any legacy CDN/media-library URL forms
 * to our standardized Cloudflare CDN host so every <img>, <video>,
 * background-image, etc. is served from the edge.
 *
 * Standard CDN host:
 *   https://cdn.planext4u.net/<key>
 *
 * `cdn.planext4u.net` is a CNAME → f005.backblazeb2.com, proxied through
 * Cloudflare (orange cloud) for caching + TLS. This avoids touching the
 * Vercel-managed www DNS record.
 */

const CDN_BASE = "https://cdn.planext4u.net";

/** Legacy bases we still need to rewrite away from. */
const LEGACY_BASES = [
  "https://cdn.planext4u.com/",
  "https://www.planext4u.net/media-library/",
  "https://planext4u.net/media-library/",
];

const BACKBLAZE_FRIENDLY = /^https?:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+\//i;
const BACKBLAZE_S3 = /^https?:\/\/s3\.[^.]+\.backblazeb2\.com\/[^/]+\//i;

/**
 * Rewrite any known Backblaze / legacy CDN URL form to the canonical
 * cdn.planext4u.net base. Returns the input unchanged for unrelated URLs.
 */
export function toCdnUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Already on the canonical CDN
  if (trimmed.startsWith(CDN_BASE + "/")) {
    return trimmed;
  }

  // Legacy CDN / media-library hosts → rewrite to cdn.planext4u.net
  for (const legacy of LEGACY_BASES) {
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
