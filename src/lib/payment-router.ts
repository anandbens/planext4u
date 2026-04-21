// Unified payment router — picks the right gateway based on the active country
// in `platform_settings` + the enabled rows in `country_payment_gateways`.
//
// Frontend just calls `openCheckout({...})` — the router decides whether to
// invoke Razorpay (IN), Paystack (NG), or Stripe (US/global) under the hood,
// and returns a normalized PaymentResult so callers don't branch on gateway.

import { supabase } from "@/integrations/supabase/client";
import { openRazorpayCheckout } from "./razorpay-checkout";
import { openPaystackCheckout } from "./paystack-checkout";

export type GatewayId = "razorpay" | "paystack" | "stripe";

export interface PaymentRequest {
  amount: number; // major units in active currency (₹/₦/$)
  currency?: string;
  description?: string;
  customer: { name?: string; email?: string; phone?: string };
  metadata?: Record<string, string>;
  // Razorpay needs an order_id and key (server-created); we create them on demand.
  // Paystack needs an email; we use customer.email.
}

export interface PaymentResult {
  gateway: GatewayId;
  reference: string;       // razorpay_payment_id, paystack reference, etc.
  order_reference?: string; // razorpay_order_id (if applicable)
  signature?: string;      // razorpay only
  verified: boolean;
  amount: number;
  currency: string;
  raw?: unknown;
}

interface ActiveGatewayInfo {
  gateway: GatewayId;
  display_name: string;
  public_key: string | null;
  country_code: string;
  currency_code: string;
}

/** Resolves the default gateway for the currently active country. */
export async function getActiveGateway(): Promise<ActiveGatewayInfo> {
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("active_country_code")
    .maybeSingle();
  const countryCode = (settings as any)?.active_country_code || "IN";

  const { data: country } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("code", countryCode)
    .maybeSingle();

  const { data: gateways } = await supabase
    .from("country_payment_gateways")
    .select("*")
    .eq("country_code", countryCode)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("display_order", { ascending: true });

  const row = (gateways || [])[0] as any;
  if (!row) throw new Error(`No payment gateway enabled for ${countryCode}`);

  return {
    gateway: row.gateway as GatewayId,
    display_name: row.display_name,
    public_key: row.public_key,
    country_code: countryCode,
    currency_code: country?.currency_code || "INR",
  };
}

/** Razorpay needs a server-side order; this thin wrapper creates one. */
async function createRazorpayOrder(amount: number, currency: string, notes?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("razorpay", {
    body: { action: "create_order", amount, currency, notes },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { order_id: string; key_id: string; amount: number; currency: string };
}

export async function openCheckout(req: PaymentRequest): Promise<PaymentResult> {
  const active = await getActiveGateway();
  const currency = req.currency || active.currency_code;

  if (active.gateway === "razorpay") {
    const order = await createRazorpayOrder(req.amount, currency, req.metadata);
    const result = await openRazorpayCheckout({
      keyId: order.key_id,
      orderId: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Planext4U",
      description: req.description,
      prefill: { name: req.customer.name, email: req.customer.email, contact: req.customer.phone },
      method: "card" as any,
      notes: req.metadata,
    });
    // Verify signature server-side
    const { data: verifyData } = await supabase.functions.invoke("razorpay", {
      body: {
        action: "verify_payment",
        order_id: result.razorpay_order_id,
        payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      },
    });
    return {
      gateway: "razorpay",
      reference: result.razorpay_payment_id,
      order_reference: result.razorpay_order_id,
      signature: result.razorpay_signature,
      verified: !!(verifyData as any)?.verified,
      amount: req.amount,
      currency,
      raw: result,
    };
  }

  if (active.gateway === "paystack") {
    if (!req.customer.email) throw new Error("Email is required for Paystack payments");
    const result = await openPaystackCheckout({
      amount: req.amount,
      currency,
      email: req.customer.email,
      metadata: { ...(req.metadata || {}), customer_name: req.customer.name },
    });
    return {
      gateway: "paystack",
      reference: result.reference,
      verified: result.verified,
      amount: result.amount,
      currency: result.currency,
      raw: result,
    };
  }

  if (active.gateway === "stripe") {
    throw new Error("Stripe checkout: enable Lovable Payments via the Integrations tab to use Stripe.");
  }

  throw new Error(`Unsupported gateway: ${active.gateway}`);
}
