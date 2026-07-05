/**
 * Intelligent Coupon Recommendation SDK.
 * All discount math is calculated on the server via `recommend_coupons_for_cart`.
 * The client only displays what the backend returns.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CartLine {
  id: string;
  vendor_id: string;
  qty: number;
  price: number;
}

export interface CouponRecommendation {
  campaign_id: string;
  campaign_name: string;
  description: string | null;
  code: string;
  discount_type: "flat" | "percentage" | string;
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number | null;
  expires_at: string | null;
  apply_mode: "manual" | "recommended" | "auto";
  priority: number;
  banner_url: string | null;
  exclusive: boolean;
  stackable: boolean;
  discount_amount: number;
  product_id: string | null;
  validation: Record<string, unknown>;
}

export interface RecommendationResult {
  coupons: CouponRecommendation[];
  best_campaign_id: string | null;
  auto_apply_campaign_id: string | null;
}

async function bestEffortGeo(): Promise<{ lat: number | null; lng: number | null }> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return { lat: null, lng: null };
  }
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) => {
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000, maximumAge: 60000 });
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { lat: null, lng: null };
  }
}

export async function recommendCouponsForCart(params: {
  customerId: string;
  cart: CartLine[];
  subtotal: number;
  lat?: number | null;
  lng?: number | null;
}): Promise<RecommendationResult> {
  if (!params.customerId || !params.cart?.length) {
    return { coupons: [], best_campaign_id: null, auto_apply_campaign_id: null };
  }
  const items = params.cart.map((c) => ({ id: c.id, vendor_id: c.vendor_id, qty: c.qty, price: c.price }));
  const geo =
    params.lat != null && params.lng != null
      ? { lat: params.lat, lng: params.lng }
      : await bestEffortGeo();

  const { data, error } = await (supabase.rpc as any)("recommend_coupons_for_cart", {
    _customer_id: params.customerId,
    _cart_items: items,
    _subtotal: params.subtotal,
    _lat: geo.lat,
    _lng: geo.lng,
    _limit: 10,
  });
  if (error) {
    console.error("recommend_coupons_for_cart failed", error);
  }
  const recos: CouponRecommendation[] = (data?.coupons as CouponRecommendation[]) || [];

  // Merge in the customer's assigned/available coupons that the cart-matcher
  // did not surface (e.g. per-user Namakkal codes on carts that already pass
  // min-order but were filtered out because the campaign wasn't cart-scored).
  // This lets the checkout page always show the user's usable coupons so they
  // can pick one and apply.
  try {
    const { data: avail } = await (supabase.rpc as any)("get_customer_available_coupons", {
      _customer_id: params.customerId,
      _lat: geo.lat,
      _lng: geo.lng,
    });
    const rows: any[] = Array.isArray(avail) ? avail : [];
    const known = new Set(recos.map((r) => r.campaign_id));
    for (const r of rows) {
      if (known.has(r.campaign_id)) continue;
      // Estimate discount from the campaign's own configured value against the
      // cart subtotal. Server-side validate_coupon_code re-computes the real
      // discount on Apply, so this is only for display.
      const dv = Number(r.discount_value || 0);
      const est =
        r.discount_type === "percent" || r.discount_type === "percentage"
          ? Math.min(
              r.max_discount != null ? Number(r.max_discount) : Infinity,
              Math.round(((params.subtotal * dv) / 100) * 100) / 100,
            )
          : Math.min(dv, params.subtotal);
      recos.push({
        campaign_id: r.campaign_id,
        campaign_name: r.name,
        description: r.description ?? null,
        code: r.code,
        discount_type: r.discount_type,
        discount_value: dv,
        max_discount: r.max_discount ?? null,
        min_order_amount: r.min_order_amount ?? null,
        expires_at: r.expires_at ?? null,
        apply_mode: "manual",
        priority: 0,
        banner_url: null,
        exclusive: false,
        stackable: false,
        discount_amount: Number.isFinite(est) ? Math.max(0, est) : 0,
        product_id: null,
        validation: {},
      });
    }
  } catch (e) {
    console.warn("get_customer_available_coupons merge failed", e);
  }

  return {
    coupons: recos,
    best_campaign_id: data?.best_campaign_id ?? (recos[0]?.campaign_id ?? null),
    auto_apply_campaign_id: data?.auto_apply_campaign_id ?? null,
  };
}

export type RecommendationEvent =
  | "recommended"
  | "viewed"
  | "applied"
  | "removed"
  | "auto_applied";

export async function logRecommendationEvent(input: {
  customerId: string | null;
  event: RecommendationEvent;
  campaignId?: string | null;
  code?: string | null;
  cart?: CartLine[] | null;
  savings?: number | null;
}): Promise<void> {
  try {
    const device =
      typeof navigator !== "undefined"
        ? /Mobi|Android/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop"
        : null;
    await supabase.from("coupon_recommendation_log").insert({
      customer_id: input.customerId,
      event: input.event,
      campaign_id: input.campaignId ?? null,
      coupon_code: input.code ?? null,
      cart_snapshot: input.cart ? (input.cart as any) : null,
      savings: input.savings ?? null,
      device,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* audit is best-effort */
  }
}
