/**
 * Customer coupon audit logging — best-effort inserts into `coupon_audit_log`.
 * All calls are fire-and-forget; failures are silently swallowed so that
 * telemetry never blocks the customer experience.
 */
import { supabase } from "@/integrations/supabase/client";

export type CouponAuditEvent =
  | "coupon_viewed"
  | "coupon_copied"
  | "coupon_details_viewed"
  | "popup_displayed"
  | "popup_closed"
  | "popup_dismissed"
  | "coupon_applied"
  | "coupon_redeemed";

interface AuditInput {
  event: CouponAuditEvent;
  customerId?: string | null;
  campaignId?: string | null;
  code?: string | null;
  orderId?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/mobile/i.test(ua)) return "mobile-web";
  return "web";
}

export async function logCouponAudit(input: AuditInput): Promise<void> {
  try {
    await supabase.from("coupon_audit_log").insert({
      event_type: input.event,
      customer_id: input.customerId ?? null,
      campaign_id: input.campaignId ?? null,
      code: input.code ?? null,
      order_id: input.orderId ?? null,
      reason: input.reason ?? null,
      device: deviceLabel(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: (input.metadata ?? {}) as any,
    } as any);
  } catch {
    /* swallow — audit failures are non-fatal */
  }
}
