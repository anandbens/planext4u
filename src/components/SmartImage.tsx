/**
 * SmartImage — drop-in <img loading="lazy" decoding="async"> replacement that resolves stored URLs through
 * `resolveB2Url`. Works for `b2-private://` refs and for raw B2/CDN URLs whose
 * bucket is private at the B2 level (returns 404 on direct fetch). Falls back
 * to rendering the source as-is for unrelated URLs / data URIs.
 *
 * Use this everywhere we render product / category / vendor / customer media
 * stored in B2 so cards/thumbnails do not break when the bucket is private.
 */
import { useEffect, useState } from "react";
import { resolveB2Url } from "@/lib/b2-upload";

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

export function SmartImage({ src, alt = "", fallback = null, className, ...rest }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    setResolved(null);
    if (!src) return;
    resolveB2Url(src)
      .then((u) => { if (!cancelled) setResolved(u || src); })
      .catch(() => { if (!cancelled) setResolved(src); });
    return () => { cancelled = true; };
  }, [src]);

  if (!src || errored) return <>{fallback}</>;
  if (!resolved) {
    // While signing, render an empty container with the same className so
    // layout doesn't shift. The image will swap in once the signed URL resolves.
    return <span className={className} aria-hidden />;
  }
  return (
    <img
      {...rest}
      src={resolved}
      alt={alt}
      className={className}
      loading={rest.loading || "lazy"}
      onError={() => setErrored(true)}
    />
  );
}
