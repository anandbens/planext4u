import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CountryConfig,
  DEFAULT_COUNTRY,
  setActiveCountry as setGlobalActiveCountry,
  formatCurrency as fmt,
} from "./currency";

interface CountryContextValue {
  country: CountryConfig;
  loading: boolean;
  refresh: () => Promise<void>;
  format: (amount: number | string | null | undefined, opts?: { compact?: boolean; showSymbol?: boolean; decimals?: number }) => string;
  symbol: string;
  code: string;
}

const CountryContext = createContext<CountryContextValue>({
  country: DEFAULT_COUNTRY,
  loading: true,
  refresh: async () => {},
  format: (a) => fmt(a),
  symbol: DEFAULT_COUNTRY.currency_symbol,
  code: DEFAULT_COUNTRY.currency_code,
});

const CACHE_KEY = "p4u:active_country_v1";
const CACHE_TS_KEY = "p4u:active_country_v1:ts";
// Country config rarely changes — cache for 24h so navigation never triggers a refetch.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCached(): { country: CountryConfig; fresh: boolean } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
    if (raw) {
      const parsed = { ...DEFAULT_COUNTRY, ...JSON.parse(raw) } as CountryConfig;
      return { country: parsed, fresh: Date.now() - ts < CACHE_TTL_MS };
    }
  } catch {}
  return { country: DEFAULT_COUNTRY, fresh: false };
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadCached()).current;
  const [country, setCountry] = useState<CountryConfig>(() => {
    setGlobalActiveCountry(initial.country);
    return initial.country;
  });
  // If cache is fresh, we do not need to block on a refresh.
  const [loading, setLoading] = useState(!initial.fresh);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_active_country");
      if (error || !data) return;
      const c = data as unknown as CountryConfig;
      const normalized: CountryConfig = {
        ...DEFAULT_COUNTRY,
        ...c,
        currency_position: (c.currency_position === "suffix" ? "suffix" : "prefix"),
      };
      setCountry(normalized);
      setGlobalActiveCountry(normalized);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch {}
    } catch (e) {
      console.warn("Country refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Persistent cache: skip network call entirely when cache is still fresh.
    // (Audit finding: platform_settings realtime channel was firing but the value
    //  almost never changes — removed to eliminate an idle websocket subscription.)
    if (!initial.fresh) {
      refresh();
    }
    // No realtime subscription — country/currency is refreshed via TTL only.
  }, [refresh, initial.fresh]);

  const value = useMemo<CountryContextValue>(() => ({
    country,
    loading,
    refresh,
    format: (amount, opts) => fmt(amount, { ...(opts || {}), country }),
    symbol: country.currency_symbol,
    code: country.currency_code,
  }), [country, loading, refresh]);

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  return useContext(CountryContext);
}

/** Convenience hook returning just the formatter. */
export function useCurrency() {
  const { format, symbol, code, country } = useCountry();
  return { format, symbol, code, country };
}
