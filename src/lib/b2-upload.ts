/**
 * Backblaze B2 upload helper.
 *
 * Flow:
 *  1. Ask the `b2-presigned-upload` edge function for a presigned PUT URL.
 *  2. PUT the file (or compressed blob) directly to Backblaze B2.
 *  3. Return the public Friendly URL (public bucket) OR the storage key
 *     prefixed with `b2-private://` (private bucket).
 *
 * No file content passes through any server we control — this is a direct
 * browser → B2 upload, which is fast and avoids edge-function payload limits.
 */

import { supabase } from "@/integrations/supabase/client";
import { toCdnUrl } from "@/lib/cdn-url";

export interface B2UploadResult {
  /** For public uploads: the Friendly URL.
   *  For private uploads: an opaque reference of the form `b2-private://<key>`
   *  that must be persisted and later resolved via `getPrivateB2Url`. */
  publicUrl: string;
  /** Raw object key inside the bucket. */
  key: string;
  /** True if uploaded to the private bucket. */
  isPrivate: boolean;
}

export interface B2UploadOptions {
  /** Folder prefix inside the bucket (e.g. "vendor-assets", "social-media"). */
  folder: string;
  /** Original filename (used to derive extension + slug). */
  filename: string;
  /** MIME type sent in the PUT request. */
  contentType: string;
  /** Optional progress callback (0-100). */
  onProgress?: (percent: number) => void;
  /** Upload to the PRIVATE B2 bucket. Required for KYC and other regulated docs. */
  private?: boolean;
}

async function getPresignedUrl(opts: {
  folder: string;
  filename: string;
  contentType: string;
  private?: boolean;
  fileBase64?: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string; isPrivate: boolean }> {
  // Explicitly attach the current session's access token. Some flows
  // (per-portal storage keys, freshly hydrated sessions, native bridge)
  // can race with `functions.invoke`'s implicit auth header, causing the
  // edge function to receive no Authorization header and reject with 401
  // "Missing Authorization".
  // Try to attach the current session's access token. Some flows (vendor
  // registration, customer registration) intentionally upload BEFORE a user
  // session exists — in those cases we send no Authorization header and let
  // the edge function fall back to its anonymous-upload allowlist (folders
  // under `vendor-reg`, `customer-reg`, etc.).
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const { data, error } = await supabase.functions.invoke("b2-presigned-upload", {
    body: {
      folder: opts.folder,
      filename: opts.filename,
      contentType: opts.contentType,
      private: opts.private === true,
      fileBase64: opts.fileBase64,
    },
    headers,
  });

  if (error) {
    // Try to surface the actual edge-function error body (FunctionsHttpError
    // exposes the raw Response on .context).
    let detail = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch { /* ignore */ }
    throw new Error(`Failed to get B2 upload URL: ${detail}`);
  }
  if (typeof data?.key !== "string") {
    throw new Error("B2 presigned-upload returned an invalid response");
  }
  return {
    uploadUrl: typeof data.uploadUrl === "string" ? data.uploadUrl : "",
    publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : "",
    key: data.key as string,
    isPrivate: data.isPrivate === true,
  };
}

const INLINE_UPLOAD_THRESHOLD_BYTES = 8 * 1024 * 1024;

async function blobToBase64(file: Blob | File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

/**
 * Upload a Blob/File directly to Backblaze B2 using a presigned URL.
 * Returns the public Friendly URL (public bucket) or the `b2-private://<key>`
 * reference (private bucket).
 */
export async function uploadToB2(
  file: Blob | File,
  options: B2UploadOptions,
): Promise<B2UploadResult> {
  const { folder, filename, contentType, onProgress } = options;
  // PRIVATE bucket uploads MUST go through the inline (server-side PUT) path
  // because the private B2 bucket has no browser CORS rules — a direct
  // browser PUT to the presigned URL fails with a "Network error" (CORS
  // preflight blocked). The edge function PUTs server-side which avoids CORS.
  // Public uploads can take either path; small files use inline to skip the
  // extra round-trip.
  const shouldInlineUpload =
    options.private === true || file.size <= INLINE_UPLOAD_THRESHOLD_BYTES;

  if (shouldInlineUpload) {
    onProgress?.(0);
    const { publicUrl, key, isPrivate } = await getPresignedUrl({
      folder,
      filename,
      contentType,
      private: options.private,
      fileBase64: await blobToBase64(file),
    });
    onProgress?.(100);
    return {
      // Always canonicalize to the cdn.planext4u.net host so callers persist
      // CDN-only URLs in the database, even if the edge function returned a
      // raw Backblaze URL (defensive fallback).
      publicUrl: isPrivate ? `b2-private://${key}` : toCdnUrl(publicUrl),
      key,
      isPrivate,
    };
  }

  const { uploadUrl, publicUrl, key, isPrivate } = await getPresignedUrl({
    folder,
    filename,
    contentType,
    private: options.private,
  });

  const uploadViaBrowser = () => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`B2 upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error uploading to B2"));
    xhr.send(file);
  });

  await uploadViaBrowser();

  const returnedUrl = isPrivate ? `b2-private://${key}` : toCdnUrl(publicUrl);
  return { publicUrl: returnedUrl, key, isPrivate };
}

/**
 * Hosts that point to our B2 buckets (direct Backblaze, our CDN, etc.).
 * URLs from these hosts are signed via the public-bucket signer because the
 * bucket may be configured as private at the B2 level (so direct GETs 404).
 */
const B2_PUBLIC_HOSTS = [
  /\.backblazeb2\.com$/i,
  /^cdn\.planext4u\.com$/i,
  /^cdn\.planext4u\.net$/i,
];

/**
 * Canonical public media base. `cdn.planext4u.net` is a CNAME pointing to
 * f005.backblazeb2.com and proxied by Cloudflare (orange cloud) for caching.
 */
const PUBLIC_CDN_BASE = "https://cdn.planext4u.net";

/** Hosts that previously served media via Vercel /media-library/. */
const MEDIA_LIBRARY_HOSTS = [/^www\.planext4u\.net$/i, /^planext4u\.net$/i];

/** Extract the object key from a known B2/CDN/media-library URL, or null if it isn't one. */
function extractB2Key(url: string): string | null {
  try {
    const u = new URL(url);
    // Legacy Vercel media-library rewrite: /media-library/<key...>
    if (MEDIA_LIBRARY_HOSTS.some((re) => re.test(u.hostname))) {
      const mlMatch = u.pathname.match(/^\/media-library\/(.+)$/);
      if (mlMatch) return decodeURIComponent(mlMatch[1]);
      return null;
    }
    const matchesHost = B2_PUBLIC_HOSTS.some((re) => re.test(u.hostname));
    if (!matchesHost) return null;
    // Backblaze friendly URL: /file/<bucket>/<key...>
    const fileMatch = u.pathname.match(/^\/file\/[^/]+\/(.+)$/);
    if (fileMatch) return decodeURIComponent(fileMatch[1]);
    // CDN-style: /<key...>
    const stripped = u.pathname.replace(/^\/+/, "");
    return stripped ? decodeURIComponent(stripped) : null;
  } catch {
    return null;
  }
}

/**
 * In-memory cache of resolved (signed) B2 URLs, plus a map of in-flight
 * sign requests so concurrent calls for the same key dedupe to a single
 * edge-function invocation.
 *
 * Cache TTL is shorter than the actual signed-URL TTL so we always return
 * a URL with comfortable headroom before expiry. Signed URLs default to
 * 300s on the edge — we cache the resolved URL for 240s.
 */
interface CacheEntry { url: string; expiresAt: number; }
const RESOLVED_CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Promise<string | null>>();
const CACHE_TTL_MS = 240 * 1000; // 4 minutes (signed URLs live ~5 min)
const MAX_CACHE_ENTRIES = 500;

function cacheGet(key: string): string | null {
  const hit = RESOLVED_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    RESOLVED_CACHE.delete(key);
    return null;
  }
  return hit.url;
}

function cacheSet(key: string, url: string) {
  // Simple bounded-cache eviction: drop oldest insertion when at capacity.
  if (RESOLVED_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = RESOLVED_CACHE.keys().next().value;
    if (firstKey) RESOLVED_CACHE.delete(firstKey);
  }
  RESOLVED_CACHE.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Manually clear the resolver cache (e.g. on sign-out or storage migration). */
export function clearResolveB2Cache() {
  RESOLVED_CACHE.clear();
  INFLIGHT.clear();
}

/**
 * Resolve a stored value that may be either:
 *   - a `b2-private://<key>` reference pointing to the private bucket, OR
 *   - a regular https URL to the public B2 bucket / CDN, OR
 *   - any other URL (returned as-is).
 *
 * For B2-hosted values, calls the `b2-presigned-download` edge function and
 * returns a short-lived signed GET URL — this works whether the bucket is
 * configured as public or private at the B2 level.
 *
 * Results are memoized in-process for ~4 minutes per stored value, and any
 * concurrent requests for the same value share a single in-flight promise,
 * so re-renders of `<SmartImage>` do not re-invoke the edge function.
 *
 * Returns null if signing fails for a private reference; falls back to the
 * original URL if signing fails for a public-bucket URL.
 */
export async function resolveB2Url(
  storedValue: string | null | undefined,
  expiresSeconds = 300,
): Promise<string | null> {
  if (!storedValue) return null;
  const value = storedValue.trim();
  if (!value) return null;

  // Cache key includes the requested TTL so callers asking for different
  // expirations don't collide.
  const cacheKey = `${expiresSeconds}|${value}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const inflight = INFLIGHT.get(cacheKey);
  if (inflight) return inflight;

  const job = (async (): Promise<string | null> => {
    // Private bucket reference
    if (value.startsWith("b2-private://")) {
      const key = value.slice("b2-private://".length);
      const { data, error } = await supabase.functions.invoke("b2-presigned-download", {
        body: { key, expiresSeconds, bucket: "private" },
      });
      if (error || !data?.url) {
        console.error("[resolveB2Url] failed to sign private", error);
        return null;
      }
      const url = data.url as string;
      cacheSet(cacheKey, url);
      return url;
    }

    // Raw B2 / legacy CDN / media-library URL — route through the Vercel
    // /media-library/ rewrite so Cloudflare (in front of Vercel) caches
    // the response at the edge without needing the www DNS record proxied.
    const publicKey = extractB2Key(value);
    if (publicKey) {
      const publicUrl = `${PUBLIC_CDN_BASE}/${publicKey
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
      cacheSet(cacheKey, publicUrl);
      return publicUrl;
    }

    // Anything else (legacy GCS URL, data URI, etc.) — return as-is
    cacheSet(cacheKey, value);
    return value;
  })();

  INFLIGHT.set(cacheKey, job);
  try {
    return await job;
  } finally {
    INFLIGHT.delete(cacheKey);
  }
}

/** True if the stored value points to the private B2 bucket. */
export function isPrivateB2Ref(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("b2-private://");
}
