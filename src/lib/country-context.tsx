import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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

function loadCached(): CountryConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_COUNTRY, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_COUNTRY;
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<CountryConfig>(() => {
    const cached = loadCached();
    setGlobalActiveCountry(cached);
    return cached;
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_active_country");
      if (error || !data) return;
      const c = data as unknown as CountryConfig;
      // Coerce currency_position to literal type
      const normalized: CountryConfig = {
        ...DEFAULT_COUNTRY,
        ...c,
        currency_position: (c.currency_position === "suffix" ? "suffix" : "prefix"),
      };
      setCountry(normalized);
      setGlobalActiveCountry(normalized);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      } catch {}
    } catch (e) {
      console.warn("Country refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Realtime: listen for platform_settings changes (country switch)
    const channel = supabase
      .channel("platform_settings_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "platform_settings" },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const value: CountryContextValue = {
    country,
    loading,
    refresh,
    format: (amount, opts) => fmt(amount, { ...(opts || {}), country }),
    symbol: country.currency_symbol,
    code: country.currency_code,
  };

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
