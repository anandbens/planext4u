import { supabase } from "@/integrations/supabase/client";

export interface OtpRateLimitResult {
  allowed: boolean;
  remaining: number;
  retry_after: number; // seconds
}

/**
 * Check OTP rate limit for a phone number.
 * Calls a SECURITY DEFINER function that atomically checks and increments.
 * Max 3 requests per 5-minute window.
 */
export async function checkOtpRateLimit(phoneNumber: string): Promise<OtpRateLimitResult> {
  const normalized = phoneNumber.replace(/[\s\-()]/g, "");

  const { data, error } = await supabase.rpc("check_otp_rate_limit", {
    _phone: normalized,
  });

  if (error) {
    console.warn("OTP rate limit check failed, allowing request:", error.message);
    // Fail open so legitimate users aren't blocked by DB issues
    return { allowed: true, remaining: 2, retry_after: 0 };
  }

  const result = data as unknown as OtpRateLimitResult;
  return {
    allowed: !!result.allowed,
    remaining: result.remaining ?? 0,
    retry_after: result.retry_after ?? 0,
  };
}
