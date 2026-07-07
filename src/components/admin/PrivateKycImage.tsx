/**
 * PrivateKycImage — admin-only KYC viewer.
 *
 * Accepts a stored value that may be a public URL (legacy) or a
 * `b2-private://<key>` reference. Resolves it to a short-lived signed URL
 * via the `b2-presigned-download` edge function and renders an <img loading="lazy" decoding="async"> or a
 * PDF placeholder. Falls back gracefully if signing fails.
 */

import { useEffect, useState } from "react";
import { FileText, Loader2, Lock, ImageOff } from "lucide-react";
import { resolveB2Url, isPrivateB2Ref } from "@/lib/b2-upload";

interface Props {
  value: string | null | undefined;
  alt?: string;
  className?: string;
  /** Render as a clickable thumbnail that opens the signed URL in a new tab. */
  clickable?: boolean;
}

export function PrivateKycImage({ value, alt = "KYC document", className = "h-20 w-20 object-cover rounded border border-border/50", clickable = true }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setUrl(null);
    if (!value) { setLoading(false); return; }
    setLoading(true);
    resolveB2Url(value).then((u) => {
      if (cancelled) return;
      if (!u) { setError(true); setLoading(false); return; }
      setUrl(u);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [value]);

  if (!value) {
    return (
      <div className={`${className} bg-secondary/50 flex items-center justify-center`}>
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className} bg-secondary/50 flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`${className} bg-secondary/50 flex flex-col items-center justify-center text-[9px] text-muted-foreground gap-0.5`}>
        <Lock className="h-4 w-4" />
        <span>No access</span>
      </div>
    );
  }

  const isPdf = (isPrivateB2Ref(value) ? value : url).toLowerCase().includes(".pdf");
  if (isPdf) {
    const Inner = (
      <div className={`${className} bg-secondary/50 flex flex-col items-center justify-center gap-0.5`}>
        <FileText className="h-5 w-5 text-primary" />
        <span className="text-[9px] text-muted-foreground">PDF</span>
      </div>
    );
    return clickable ? <a href={url} target="_blank" rel="noopener noreferrer">{Inner}</a> : Inner;
  }

  const img = <img src={url} alt={alt} className={className} loading="lazy" />;
  return clickable ? <a href={url} target="_blank" rel="noopener noreferrer">{img}</a> : img;
}

/**
 * Hook variant: returns a signed URL (or null) for a given stored value.
 * Useful when you need to programmatically download / link.
 */
export function usePrivateKycUrl(value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUrl(null);
    if (!value) { setLoading(false); return; }
    resolveB2Url(value).then((u) => {
      if (cancelled) return;
      setUrl(u);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [value]);

  return { url, loading };
}
