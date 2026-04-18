import { useEffect, useState } from "react";

/**
 * Returns a playable video URL for the given source.
 *
 * Supabase Storage often serves video files with `content-type: application/octet-stream`,
 * which prevents some mobile browsers (especially iOS Safari and older Android WebViews)
 * from playing the video even though the file is a valid mp4.
 *
 * Strategy:
 *  1. Immediately expose the original URL so the <video> element can start streaming
 *     using the `<source type="video/mp4">` hint (most browsers honor that over Content-Type).
 *  2. In the background, do a HEAD request — if the server already returns a proper
 *     `video/*` content-type, we leave the URL alone (no blob fetch needed).
 *  3. Only as a last-resort fallback (mime mismatch + small file under 6 MB), download
 *     the file and re-wrap it as a Blob with the correct mime so playback works.
 *     We skip the blob fetch for large files to avoid long delays / OOM on mobile.
 */
export function usePlayableVideoSource(sourceUrl?: string) {
  const [resolvedUrl, setResolvedUrl] = useState(sourceUrl || "");

  useEffect(() => {
    if (!sourceUrl) {
      setResolvedUrl("");
      return;
    }

    // Always expose the original URL first so playback can start immediately.
    setResolvedUrl(sourceUrl);

    let revokedUrl: string | null = null;
    let cancelled = false;

    const lower = sourceUrl.toLowerCase();
    const expectedMime = lower.endsWith(".webm")
      ? "video/webm"
      : lower.endsWith(".mov")
        ? "video/quicktime"
        : "video/mp4";

    const controller = new AbortController();
    const MAX_BLOB_FETCH_BYTES = 6 * 1024 * 1024; // 6 MB safety cap

    const maybeRewrap = async () => {
      try {
        // 1. Cheap HEAD probe to inspect content-type & size.
        const head = await fetch(sourceUrl, { method: "HEAD", signal: controller.signal });
        if (cancelled || !head.ok) return;

        const ct = (head.headers.get("content-type") || "").toLowerCase();
        const len = Number(head.headers.get("content-length") || "0");

        // Server already returns a proper video mime — no rewrap needed.
        if (ct.startsWith("video/")) return;

        // File too large to safely buffer — let the browser stream the original
        // URL and rely on the <source type="..."> hint in the markup.
        if (len > 0 && len > MAX_BLOB_FETCH_BYTES) return;

        // Small file with bad mime — download once and republish as a Blob URL.
        const response = await fetch(sourceUrl, {
          signal: controller.signal,
          headers: { Accept: "video/*" },
        });
        if (cancelled || !response.ok) return;

        const blob = await response.blob();
        if (cancelled || blob.size === 0) return;

        const playableBlob =
          blob.type === expectedMime ? blob : new Blob([blob], { type: expectedMime });
        revokedUrl = URL.createObjectURL(playableBlob);
        setResolvedUrl(revokedUrl);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("[usePlayableVideoSource] probe/rewrap failed", error);
        }
      }
    };

    void maybeRewrap();

    return () => {
      cancelled = true;
      controller.abort();
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [sourceUrl]);

  return resolvedUrl;
}
