/**
 * Coupon Redemption SDK — thin wrapper around the atomic
 * `redeem_coupon_for_order` RPC. This is the single entry point
 * every payment-success handler must call to finalise a coupon.
 *
 * The RPC is idempotent: retrying with the same (order_id, code)
 * returns the existing redemption instead of creating a duplicate.
 * It never mutates coupon status client-side.
 */
import { supabase } from "@/integrations/supabase/client";
import { logCouponAudit } from "./audit";

export interface RedeemCouponInput {
  orderId: string;
  code: string;
  customerId?: string | null;
  vendorId?: string | null;
  productId?: string | null;
  discountAmount?: number;
  orderAmount?: number;
  paymentReference?: string | null;
  requirePaymentSuccess?: boolean;
}

export interface RedeemCouponResult {
  ok: boolean;
  idempotent?: boolean;
  redemption_id?: string;
  campaign_id?: string;
  code?: string;
  discount_amount?: number;
  reason?: string;
  error?: string;
}

const REASON_MESSAGES: Record<string, string> = {
  ok: "Coupon redeemed",
  invalid_input: "Missing order or coupon code",
  order_not_found: "Order not found",
  payment_not_success: "Payment is not marked successful yet",
  coupon_not_found: "Coupon code not found",
  coupon_already_used_other_order: "Coupon already redeemed for a different order",
  campaign_not_found: "Coupon campaign not found",
  already_redeemed: "Coupon already redeemed for this order",
  exception: "Redemption failed",
};

function detectDevice(): string {
  if (typeof navigator === "undefined") return "server";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/mobile/i.test(ua)) return "mobile-web";
  return "web";
}

/**
 * Finalise a coupon against a paid order.
 * Call this **only** after payment status = SUCCESS.
 * Safe to retry — the underlying transaction is idempotent.
 */
export async function redeemCouponForOrder(
  input: RedeemCouponInput
): Promise<RedeemCouponResult> {
  const device = detectDevice();
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  const { data, error } = await supabase.rpc("redeem_coupon_for_order" as never, {
    p_order_id: input.orderId,
    p_code: input.code,
    p_customer_id: input.customerId ?? null,
    p_vendor_id: input.vendorId ?? null,
    p_product_id: input.productId ?? null,
    p_discount_amount: input.discountAmount ?? 0,
    p_order_amount: input.orderAmount ?? 0,
    p_payment_reference: input.paymentReference ?? null,
    p_device: device,
    p_ip: null,
    p_user_agent: userAgent,
    p_require_payment_success: input.requirePaymentSuccess ?? true,
  } as never);

  if (error) {
    return { ok: false, reason: "rpc_error", error: error.message };
  }

  const result = (data ?? {}) as RedeemCouponResult;

  // Best-effort client audit trail (server already logs the primary audit row)
  void logCouponAudit({
    event: "coupon_redeemed",
    code: input.code,
    orderId: input.orderId,
    customerId: input.customerId ?? null,
    reason: result.reason ?? null,
    metadata: {
      ok: result.ok,
      idempotent: result.idempotent,
      redemption_id: result.redemption_id,
      discount_amount: input.discountAmount,
      order_amount: input.orderAmount,
    },
  });

  return result;
}

export function describeRedeemReason(reason?: string | null): string {
  if (!reason) return "";
  if (REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
  if (reason.startsWith("coupon_status_"))
    return `Coupon in ${reason.replace("coupon_status_", "")} state`;
  return reason;
}

/**
 * Fetch a customer's redeemed / rolled-back coupon history.
 */
export async function getCustomerCouponHistory(
  customerId: string,
  limit = 50,
  offset = 0
) {
  const { data, error } = await supabase.rpc(
    "get_customer_coupon_history" as never,
    { p_customer_id: customerId, p_limit: limit, p_offset: offset } as never
  );
  if (error) throw error;
  return (data ?? []) as Array<{
    redemption_id: string;
    campaign_id: string;
    campaign_name: string | null;
    code: string;
    order_id: string;
    vendor_id: string | null;
    product_id: string | null;
    discount_amount: number;
    order_amount: number;
    redeemed_at: string;
    rolled_back: boolean;
  }>;
}

/**
 * Fetch a vendor's coupon redemption history.
 */
export async function getVendorCouponHistory(
  vendorId: string,
  limit = 100,
  offset = 0
) {
  const { data, error } = await supabase.rpc(
    "get_vendor_coupon_history" as never,
    { p_vendor_id: vendorId, p_limit: limit, p_offset: offset } as never
  );
  if (error) throw error;
  return (data ?? []) as Array<{
    usage_id: string;
    campaign_id: string;
    campaign_name: string | null;
    code: string;
    order_id: string;
    customer_id: string | null;
    customer_mobile: string | null;
    discount_amount: number;
    order_amount: number;
    redeemed_at: string;
  }>;
}
