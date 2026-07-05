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
    return { coupons: [], best_campaign_id: null, auto_apply_campaign_id: null };
  }
  return {
    coupons: (data?.coupons as CouponRecommendation[]) || [],
    best_campaign_id: data?.best_campaign_id ?? null,
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
