/**
 * Coupon Reservation client SDK — thin wrapper around the Postgres
 * reservation RPCs. Every reservation lifecycle change is transactional
 * and audit-logged on the server; this module never mutates status locally.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ReserveInput {
  customerId: string;
  code: string;
  cartId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ReserveResult {
  ok: boolean;
  reservation_id?: string;
  code?: string;
  campaign_id?: string;
  expires_at?: string;
  timeout_minutes?: number;
  reason?: string;
  idempotent?: boolean;
  status?: string;
}

export interface ActiveReservation {
  reservation_id: string;
  campaign_id: string;
  code: string;
  status: string;
  reserved_at: string;
  expires_at: string;
  seconds_remaining: number;
}

const RESERVE_REASON: Record<string, string> = {
  ok: "Coupon reserved",
  invalid_input: "Missing coupon code or customer",
  coupon_not_found: "Coupon code not found",
  coupon_already_used: "This coupon has already been used",
  coupon_currently_reserved: "Coupon currently reserved by another customer",
  coupon_expired: "This coupon has expired",
  coupon_cancelled: "This coupon has been cancelled",
  coupon_unavailable: "Coupon no longer available",
  campaign_not_found: "Campaign not found",
  reservation_disabled: "Reservations are disabled for this campaign",
  other_active_reservation: "You already have another reservation active",
  already_reserved: "Coupon is already reserved by you",
  reservation_not_found: "Reservation not found",
  not_your_reservation: "Reservation belongs to a different customer",
  reservation_not_active: "Reservation is no longer active",
  reservation_expired: "Reservation expired",
};

export function reservationReasonLabel(reason?: string): string {
  return (reason && RESERVE_REASON[reason]) || reason || "Reservation failed";
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/mobile/i.test(ua)) return "mobile-web";
  return "web";
}

export async function reserveCoupon(input: ReserveInput): Promise<ReserveResult> {
  const { data, error } = await (supabase.rpc as any)("reserve_coupon", {
    _customer_id: input.customerId,
    _code: input.code,
    _cart_id: input.cartId ?? null,
    _lat: input.lat ?? null,
    _lng: input.lng ?? null,
    _device: deviceLabel(),
    _ip: null,
    _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false, reason: "unknown" }) as ReserveResult;
}

export async function releaseCouponReservation(
  reservationId: string,
  customerId: string,
  reason: string = "released"
): Promise<ReserveResult> {
  const { data, error } = await (supabase.rpc as any)("release_coupon_reservation", {
    _reservation_id: reservationId,
    _customer_id: customerId,
    _reason: reason,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false }) as ReserveResult;
}

export async function redeemCouponReservation(params: {
  reservationId: string;
  customerId: string;
  orderId: string;
  paymentReference?: string;
  discountAmount?: number;
}): Promise<ReserveResult> {
  const { data, error } = await (supabase.rpc as any)("redeem_coupon_reservation", {
    _reservation_id: params.reservationId,
    _customer_id: params.customerId,
    _order_id: params.orderId,
    _payment_reference: params.paymentReference ?? null,
    _discount_amount: params.discountAmount ?? 0,
  });
  if (error) return { ok: false, reason: error.message };
  return (data ?? { ok: false }) as ReserveResult;
}

export async function getActiveCouponReservation(customerId: string): Promise<ActiveReservation | null> {
  const { data, error } = await (supabase.rpc as any)("get_active_coupon_reservation", {
    _customer_id: customerId,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as ActiveReservation) ?? null;
}
