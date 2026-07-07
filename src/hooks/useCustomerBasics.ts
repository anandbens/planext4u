import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";


/**
 * Single source of truth for the customer's frequently-read "basic" profile
 * fields: wallet_points and profile_photo (and name for convenience).
 *
 * Historically each screen (Layout header, wallet chip, dashboard avatar,
 * cart page, food cart, etc.) issued its own query for either wallet_points
 * or profile_photo against the same customer row. pg_stat_statements showed
 * >1,000 duplicate calls per view for these two columns.
 *
 * This hook consolidates them behind a single React Query key so every
 * consumer reads from the shared cache. Fetches once per session per user
 * with a long staleTime, and is invalidated explicitly through the exported
 * event helpers when the values change (order placed, points redeemed,
 * profile picture updated).
 */

export interface CustomerBasics {
  id: string;
  name: string | null;
  wallet_points: number;
  profile_photo: string | null;
}

export const CUSTOMER_BASICS_KEY = "customer-basics";
export const WALLET_REFRESH_EVENT = "wallet:refresh";

export function useCustomerBasics() {
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;

  const query = useQuery<CustomerBasics | null>({
    queryKey: [CUSTOMER_BASICS_KEY, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("customers")
        .select("id, name, wallet_points, profile_photo")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        name: data.name ?? null,
        wallet_points: data.wallet_points ?? 0,
        profile_photo: data.profile_photo ?? null,
      };
    },
    enabled: !!userId,
    // Basic profile changes rarely; keep it fresh for 5 minutes and cached
    // for 30 minutes. Explicit invalidations still fire immediately.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    const handler = () => {
      qc.invalidateQueries({ queryKey: [CUSTOMER_BASICS_KEY, userId] });
    };
    window.addEventListener(WALLET_REFRESH_EVENT, handler);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, handler);
  }, [qc, userId]);

  // Stabilize the returned object so consumers wrapped in React.memo don't
  // re-render on unrelated parent updates. Fields that don't change keep the
  // same reference across renders.
  const data = query.data ?? null;
  const authName = customerUser?.name ?? null;
  return useMemo(() => ({
    basics: data,
    walletPoints: data?.wallet_points ?? 0,
    profilePhoto: data?.profile_photo ?? null,
    name: data?.name ?? authName ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }), [data, authName, query.isLoading, query.refetch]);
}


export function refreshCustomerBasics() {
  try { window.dispatchEvent(new Event(WALLET_REFRESH_EVENT)); } catch { /* ignore */ }
}
