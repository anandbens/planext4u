/**
 * B2Media — renders an image or video from a stored URL that may be:
 *  - a `b2-private://<key>` reference,
 *  - a public B2/CDN URL whose bucket is now private at the B2 level,
 *  - or any other public URL.
 *
 * Resolves to a short-lived signed URL via `resolveB2Url` so the asset
 * loads regardless of the bucket's public/private status at B2.
 */

import { useEffect, useState } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { resolveB2Url } from "@/lib/b2-upload";

interface Props {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  kind?: "image" | "video";
}

export function B2Media({ src, alt = "", className = "", kind = "image" }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setResolved(null);
    if (!src) { setLoading(false); return; }
    setLoading(true);
    resolveB2Url(src).then((u) => {
      if (cancelled) return;
      if (!u) { setError(true); setLoading(false); return; }
      setResolved(u);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [src]);

  if (loading) {
    return (
      <div className={`${className} bg-secondary/30 flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !resolved) {
    return (
      <div className={`${className} bg-secondary/30 flex items-center justify-center`}>
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  if (kind === "video") {
    return <video src={resolved} controls className={className} />;
  }
  return <img src={resolved} alt={alt} className={className} loading="lazy" />;
}
