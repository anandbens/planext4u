import { useEffect, useState } from "react";

/**
 * Some storage files are served with application/octet-stream, which breaks
 * mobile video playback. For video ads, fetch once and create a Blob URL with
 * the correct MIME type so mobile browsers can play it reliably.
 */
export function usePlayableVideoSource(sourceUrl?: string) {
  const [resolvedUrl, setResolvedUrl] = useState(sourceUrl || "");

  useEffect(() => {
    if (!sourceUrl) {
      setResolvedUrl("");
      return;
    }

    let revokedUrl: string | null = null;
    let cancelled = false;
    const lower = sourceUrl.toLowerCase();
    const mimeType = lower.endsWith(".webm")
      ? "video/webm"
      : lower.endsWith(".mov")
        ? "video/quicktime"
        : "video/mp4";

    setResolvedUrl(sourceUrl);

    const controller = new AbortController();

    const resolve = async () => {
      try {
        const response = await fetch(sourceUrl, {
          signal: controller.signal,
          headers: { Accept: "video/*" },
        });
        if (!response.ok) return;

        const blob = await response.blob();
        if (cancelled || blob.size === 0) return;

        const playableBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
        revokedUrl = URL.createObjectURL(playableBlob);
        setResolvedUrl(revokedUrl);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("[usePlayableVideoSource] fallback failed", error);
        }
      }
    };

    void resolve();

    return () => {
      cancelled = true;
      controller.abort();
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [sourceUrl]);

  return resolvedUrl;
}