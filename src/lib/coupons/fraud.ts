/**
 * Fraud Detection SDK — client wrapper around the fraud_evaluate,
 * fraud_track_device and fraud_blacklist_* RPCs. Every call is a
 * fire-and-forget async that never blocks the caller and always
 * returns a defined FraudDecision (defaults to "allow" on error so
 * existing flows are not broken).
 */
import { supabase } from "@/integrations/supabase/client";

export type FraudEvent =
  | "registration"
  | "login"
  | "coupon_view"
  | "coupon_apply"
  | "checkout"
  | "payment"
  | "redemption"
  | "rollback";

export type FraudAction = "allow" | "warn" | "verify" | "block" | "blacklist";
export type FraudSeverity = "low" | "medium" | "high" | "critical";

export interface FraudEvaluateInput {
  event: FraudEvent;
  customerId?: string | null;
  mobile?: string | null;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  campaignId?: string | null;
  code?: string | null;
  orderId?: string | null;
  lat?: number | null;
  lng?: number | null;
  metadata?: Record<string, any>;
}

export interface FraudDecision {
  ok: boolean;
  action: FraudAction;
  severity: FraudSeverity;
  score: number;
  evaluation_id?: string;
  matched_rules?: Array<{
    code: string;
    score: number;
    action: FraudAction;
    severity: FraudSeverity;
    reason: string;
  }>;
  reasons?: string[];
}

const ALLOW: FraudDecision = { ok: true, action: "allow", severity: "low", score: 0 };

/**
 * Stable browser device fingerprint (hex, 12 chars).
 * Not cryptographically secure; sufficient for correlating registrations
 * and redemptions from the same browser/device.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "p4u_device_fp";
  try {
    const cached = localStorage.getItem(KEY);
    if (cached) return cached;
  } catch { /* ignore */ }

  const parts = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join("|");

  // Simple FNV-1a-ish hash → hex
  let h = 2166136261 >>> 0;
  for (let i = 0; i < parts.length; i++) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const fp = h.toString(16).padStart(8, "0") + Math.random().toString(16).slice(2, 6);
  try { localStorage.setItem(KEY, fp); } catch { /* ignore */ }
  return fp;
}

export function collectDeviceMetadata(): Record<string, any> {
  if (typeof window === "undefined") return {};
  return {
    device_model: navigator.platform,
    os_name: /Windows/i.test(navigator.userAgent) ? "Windows"
      : /Mac/i.test(navigator.userAgent) ? "macOS"
      : /Android/i.test(navigator.userAgent) ? "Android"
      : /iPhone|iPad|iOS/i.test(navigator.userAgent) ? "iOS"
      : "unknown",
    browser: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

export async function trackDevice(customerId?: string | null): Promise<void> {
  try {
    const fp = getDeviceFingerprint();
    await supabase.rpc("fraud_track_device" as never, {
      p_fingerprint: fp,
      p_customer_id: customerId ?? null,
      p_metadata: collectDeviceMetadata(),
    } as never);
  } catch { /* swallow */ }
}

/**
 * Evaluate a fraud event. Never throws. On RPC error returns an "allow"
 * decision so the caller's happy path continues.
 */
export async function evaluateFraud(input: FraudEvaluateInput): Promise<FraudDecision> {
  try {
    const { data, error } = await supabase.rpc("fraud_evaluate" as never, {
      p_event: input.event,
      p_customer_id: input.customerId ?? null,
      p_mobile: input.mobile ?? null,
      p_device_fingerprint: input.deviceFingerprint ?? getDeviceFingerprint(),
      p_ip_address: input.ipAddress ?? null,
      p_campaign_id: input.campaignId ?? null,
      p_code: input.code ?? null,
      p_order_id: input.orderId ?? null,
      p_lat: input.lat ?? null,
      p_lng: input.lng ?? null,
      p_metadata: input.metadata ?? {},
    } as never);
    if (error) return ALLOW;
    return (data ?? ALLOW) as FraudDecision;
  } catch {
    return ALLOW;
  }
}

export async function isBlacklisted(
  entity_type: "customer" | "mobile" | "device" | "ip" | "email",
  entity_value: string
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("fraud_blacklist_check" as never, {
      p_entity_type: entity_type,
      p_entity_value: entity_value,
    } as never);
    return Boolean(data);
  } catch { return false; }
}

export async function addToBlacklist(
  entity_type: "customer" | "mobile" | "device" | "ip" | "email",
  entity_value: string,
  reason?: string,
  severity: FraudSeverity = "high",
  expires_at?: string | null
) {
  const { data, error } = await supabase.rpc("fraud_blacklist_add" as never, {
    p_entity_type: entity_type,
    p_entity_value: entity_value,
    p_reason: reason ?? null,
    p_source: "manual",
    p_severity: severity,
    p_expires_at: expires_at ?? null,
    p_metadata: {},
  } as never);
  if (error) throw error;
  return data as string;
}
