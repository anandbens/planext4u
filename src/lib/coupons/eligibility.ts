// Reusable Coupon Eligibility client — thin wrapper over the
// evaluate_coupon_eligibility Postgres function. This is the SAME source
// of truth used by Customer App, Vendor App, Checkout & Redemption.
import { supabase } from "@/integrations/supabase/client";

export interface EligibilityInput {
  campaignId: string;
  customerId?: string;
  vendorId?: string;
  productIds?: string[];
  lat?: number;
  lng?: number;
  cartValue?: number;
  quantity?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  matched?: Record<string, any>;
  min_order_amount?: number;
  max_order_amount?: number;
  distance_km?: number;
  radius_km?: number;
}

const REASON_LABEL: Record<string, string> = {
  ok: "Eligible",
  campaign_not_found: "Campaign not found",
  campaign_inactive: "Campaign is inactive",
  not_yet_started: "Campaign has not started yet",
  campaign_expired: "Campaign has expired",
  campaign_exhausted: "All coupons in this campaign have been used",
  below_min_order: "Order value is below the minimum required",
  above_max_order: "Order value exceeds the maximum allowed",
  below_min_qty: "Quantity is below the minimum required",
  above_max_qty: "Quantity exceeds the maximum allowed",
  vendor_not_allowed: "This vendor is not part of the campaign",
  vendor_not_in_list: "This vendor is not eligible",
  vendor_category_not_allowed: "This vendor category is not eligible",
  no_eligible_product: "None of the cart products are eligible",
  no_eligible_category: "No cart items match the eligible categories",
  state_not_allowed: "This state is not eligible",
  outside_radius: "Location is outside the eligible radius",
  customer_not_in_list: "This customer is not on the eligible list",
  not_referral_customer: "Only referral customers are eligible",
  not_first_time_user: "Only first-time users are eligible",
  below_min_orders: "Order history requirement not met",
  above_max_orders: "Maximum number of orders exceeded",
  below_min_lifetime_spend: "Lifetime spend requirement not met",
  per_customer_limit_reached: "You have already used this coupon the maximum number of times",
  customer_required: "This coupon requires customer identification",
};

export function eligibilityReasonLabel(reason: string): string {
  return REASON_LABEL[reason] || reason;
}

export async function evaluateCouponEligibility(input: EligibilityInput): Promise<EligibilityResult> {
  const { data, error } = await (supabase.rpc as any)("evaluate_coupon_eligibility", {
    _campaign_id: input.campaignId,
    _customer_id: input.customerId ?? null,
    _vendor_id: input.vendorId ?? null,
    _product_ids: input.productIds ?? null,
    _lat: input.lat ?? null,
    _lng: input.lng ?? null,
    _cart_value: input.cartValue ?? null,
    _quantity: input.quantity ?? null,
  });
  if (error) return { eligible: false, reason: "error", matched: { error: error.message } };
  return data as EligibilityResult;
}
