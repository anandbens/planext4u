import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google AdSense unit driven entirely by `platform_variables` so the admin can
 * turn ads on/off and swap publisher / slot ids without a code change.
 *
 * Keys used:
 *   adsense_enabled         -> "true" | "false"
 *   adsense_client_id       -> "ca-pub-XXXXXXXXXXXXXXXX"
 *   adsense_slot_socio      -> in-feed slot id
 *   adsense_slot_ecommerce  -> display slot id for shopping surfaces
 *
 * Renders nothing at all while unconfigured, so pages stay clean until the
 * AdSense account details are filled in.
 */

type AdSenseConfig = {
  enabled: boolean;
  clientId: string;
  slotSocio: string;
  slotEcommerce: string;
};

let cachedConfig: AdSenseConfig | null = null;
let inflight: Promise<AdSenseConfig> | null = null;

async function loadAdSenseConfig(): Promise<AdSenseConfig> {
  if (cachedConfig) return cachedConfig;
  if (inflight) return inflight;
  inflight = (async () => {
    const empty: AdSenseConfig = { enabled: false, clientId: "", slotSocio: "", slotEcommerce: "" };
    try {
      const { data } = await supabase
        .from("platform_variables")
        .select("key, value")
        .in("key", ["adsense_enabled", "adsense_client_id", "adsense_slot_socio", "adsense_slot_ecommerce"]);
      const map = new Map((data || []).map((r: any) => [r.key, String(r.value ?? "").trim()]));
      cachedConfig = {
        enabled: (map.get("adsense_enabled") || "").toLowerCase() === "true",
        clientId: map.get("adsense_client_id") || "",
        slotSocio: map.get("adsense_slot_socio") || "",
        slotEcommerce: map.get("adsense_slot_ecommerce") || "",
      };
      return cachedConfig;
    } catch {
      cachedConfig = empty;
      return empty;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function ensureAdSenseScript(clientId: string) {
  if (typeof document === "undefined") return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  if (document.querySelector(`script[data-adsense="${clientId}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-adsense", clientId);
  document.head.appendChild(s);
}

interface GoogleAdUnitProps {
  /** Which configured slot to render. */
  placement: "socio" | "ecommerce";
  className?: string;
  /** AdSense format; "fluid" suits in-feed placements. */
  format?: string;
  layoutKey?: string;
  /** Show the small "Sponsored" chrome above the unit (used in the social feed). */
  labelled?: boolean;
}

export function GoogleAdUnit({
  placement,
  className = "",
  format = "auto",
  layoutKey,
  labelled = false,
}: GoogleAdUnitProps) {
  const [config, setConfig] = useState<AdSenseConfig | null>(cachedConfig);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void loadAdSenseConfig().then((c) => { if (mounted) setConfig(c); });
    return () => { mounted = false; };
  }, []);

  const slot = placement === "socio" ? config?.slotSocio : config?.slotEcommerce;
  const active = Boolean(config?.enabled && config?.clientId && slot);

  useEffect(() => {
    if (!active || !config || pushedRef.current) return;
    ensureAdSenseScript(config.clientId);
    try {
      const w = window as any;
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      /* AdSense not reachable (blocked/offline) — fail silently */
    }
  }, [active, config]);

  if (!active || !config) return null;

  return (
    <div className={className}>
      {labelled && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">Ad</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Sponsored</p>
            <p className="text-[11px] text-muted-foreground">Google Ads</p>
          </div>
        </div>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={config.clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}

/**
 * True when AdSense is enabled AND the placement's slot id is configured.
 * Lets feeds decide whether a Google slot would actually render, so an ad
 * position is never left empty (and never doubled up with a platform ad).
 */
export function useAdSenseActive(placement: "socio" | "ecommerce"): boolean {
  const [config, setConfig] = useState<AdSenseConfig | null>(cachedConfig);
  useEffect(() => {
    let mounted = true;
    void loadAdSenseConfig().then((c) => { if (mounted) setConfig(c); });
    return () => { mounted = false; };
  }, []);
  const slot = placement === "socio" ? config?.slotSocio : config?.slotEcommerce;
  return Boolean(config?.enabled && config?.clientId && slot);
}

