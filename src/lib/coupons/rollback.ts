/**
 * Coupon Rollback SDK — thin wrapper around the atomic
 * `rollback_coupon_for_order` and `evaluate_coupon_rollback` RPCs.
 *
 * Every rollback is a single database transaction on the server that:
 *   - restores the coupon code to active,
 *   - marks the redemption rolled_back,
 *   - decrements campaign totals / analytics,
 *   - releases any active reservation,
 *   - writes a rollback_history row and an audit_log entry.
 *
 * The RPC is idempotent: retrying on an already-rolled-back order
 * returns `{ ok: true, idempotent: true }` instead of erroring.
 *
 * There is also a database trigger that auto-invokes this when an
 * order's status changes to cancelled / payment_failed / refunded;
 * calling this SDK explicitly is only needed for admin-initiated
 * rollbacks, partial refunds, or reservation releases.
 */
import { supabase } from "@/integrations/supabase/client";
import { logCouponAudit } from "./audit";

export type RollbackEvent =
  | "payment_failed"
  | "cancelled"
  | "refunded"
  | "partial_refund"
  | "reservation_release";

export interface RollbackInput {
  orderId: string;
  event: RollbackEvent;
  reason?: string | null;
  refundId?: string | null;
  productId?: string | null;
  actor?: string;
  force?: boolean;
}

export interface RollbackResult {
  ok: boolean;
  idempotent?: boolean;
  rollback_id?: string;
  campaign_id?: string;
  code?: string;
  restored_status?: string;
  reason?: string;
  policy?: string;
  window_minutes?: number;
  age_minutes?: number;
  error?: string;
}

export interface EvaluateResult {
  ok: boolean;
  reason?: string;
  policy?: string;
  window_minutes?: number;
  age_minutes?: number;
  campaign_id?: string;
  coupon_code_id?: string;
  code?: string;
  discount_amount?: number;
  product_id?: string | null;
}

const REASON_MESSAGES: Record<string, string> = {
  ok: "Coupon can be restored",
  invalid_input: "Missing order or event",
  no_active_redemption: "No coupon to roll back on this order",
  already_rolled_back: "Coupon already restored for this order",
  campaign_missing: "Campaign no longer exists",
  campaign_expired: "Campaign has expired",
  campaign_inactive: "Campaign is not active",
  policy_never: "Campaign never restores coupons",
  policy_mismatch: "Campaign policy does not allow this rollback event",
  product_mismatch: "Refunded product is not the coupon-eligible product",
  window_expired: "Rollback window has expired",
  exception: "Rollback failed",
};

export function describeRollbackReason(reason?: string | null): string {
  if (!reason) return "";
  if (REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
  if (reason.startsWith("code_status_"))
    return `Coupon in ${reason.replace("code_status_", "")} state`;
  return reason;
}

/**
 * Evaluate whether a coupon on an order can be rolled back for a given event.
 * Read-only. Safe to call from customer / vendor / admin UIs.
 */
export async function evaluateCouponRollback(
  orderId: string,
  event: RollbackEvent,
  productId?: string | null
): Promise<EvaluateResult> {
  const { data, error } = await supabase.rpc(
    "evaluate_coupon_rollback" as never,
    {
      p_order_id: orderId,
      p_event: event,
      p_product_id: productId ?? null,
    } as never
  );
  if (error) return { ok: false, reason: "rpc_error" };
  return (data ?? { ok: false }) as EvaluateResult;
}

/**
 * Roll back a coupon on an order. Server enforces campaign policy;
 * pass `force: true` only for admin overrides (server still audits).
 * Idempotent — safe to retry.
 */
export async function rollbackCouponForOrder(
  input: RollbackInput
): Promise<RollbackResult> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const device =
    typeof navigator === "undefined"
      ? "server"
      : /android/i.test(navigator.userAgent)
        ? "android"
        : /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "ios"
          : "web";

  const { data, error } = await supabase.rpc(
    "rollback_coupon_for_order" as never,
    {
      p_order_id: input.orderId,
      p_event: input.event,
      p_reason: input.reason ?? null,
      p_refund_id: input.refundId ?? null,
      p_product_id: input.productId ?? null,
      p_actor: input.actor ?? "system",
      p_ip: null,
      p_device: device,
      p_user_agent: userAgent,
      p_force: input.force ?? false,
    } as never
  );

  if (error) return { ok: false, reason: "rpc_error", error: error.message };
  const result = (data ?? {}) as RollbackResult;

  void logCouponAudit({
    event: "coupon_redeemed",
    code: result.code ?? null,
    orderId: input.orderId,
    reason: `rollback:${input.event}:${result.reason ?? (result.ok ? "ok" : "denied")}`,
    metadata: {
      rollback: true,
      ok: result.ok,
      idempotent: result.idempotent,
      rollback_id: result.rollback_id,
      event: input.event,
      product_id: input.productId,
      forced: input.force,
    },
  });

  return result;
}

/**
 * Customer's coupon rollback history.
 */
export async function getCustomerRollbackHistory(
  customerId: string,
  limit = 50,
  offset = 0
) {
  const { data, error } = await supabase.rpc(
    "get_customer_rollback_history" as never,
    { p_customer_id: customerId, p_limit: limit, p_offset: offset } as never
  );
  if (error) throw error;
  return (data ?? []) as Array<{
    rollback_id: string;
    campaign_id: string;
    campaign_name: string | null;
    code: string;
    order_id: string;
    refund_id: string | null;
    old_status: string;
    new_status: string;
    rollback_reason: string;
    rolled_back_at: string;
  }>;
}

/**
 * Vendor's coupon rollback history.
 */
export async function getVendorRollbackHistory(
  vendorId: string,
  limit = 100,
  offset = 0
) {
  const { data, error } = await supabase.rpc(
    "get_vendor_rollback_history" as never,
    { p_vendor_id: vendorId, p_limit: limit, p_offset: offset } as never
  );
  if (error) throw error;
  return (data ?? []) as Array<{
    rollback_id: string;
    campaign_id: string;
    campaign_name: string | null;
    code: string;
    order_id: string;
    customer_id: string | null;
    old_status: string;
    new_status: string;
    rollback_reason: string;
    rolled_back_at: string;
  }>;
}
