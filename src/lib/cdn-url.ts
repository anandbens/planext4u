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

/** 1x1 transparent GIF — used as a safe no-op when an invalid value is passed to <img src>. */
const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Legacy bases we still need to rewrite away from. */
const LEGACY_BASES = [
  "https://cdn.planext4u.com/",
  "https://www.planext4u.net/media-library/",
  "https://planext4u.net/media-library/",
];

const BACKBLAZE_FRIENDLY = /^https?:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+\//i;
const BACKBLAZE_S3 = /^https?:\/\/s3\.[^.]+\.backblazeb2\.com\/[^/]+\//i;

/**
 * Return true when `value` looks like a real renderable image source —
 * an absolute URL, a data:/blob: URI, or a root-absolute path.
 *
 * We deliberately reject bare strings (e.g. emoji like "📦", "Sample text",
 * "shop.jpg") because the browser would resolve them as relative paths
 * against the current origin and produce broken requests like
 * `https://www.planext4u.net/%F0%9F%93%A6`.
 */
export function isRenderableImageSrc(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("data:") || v.startsWith("blob:")) return true;
  if (v.startsWith("//")) return true; // protocol-relative
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith("/")) return true; // root-absolute
  return false;
}

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

export { BLANK_PIXEL };

