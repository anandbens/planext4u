// Paystack payment gateway edge function (Nigeria)
// Mirrors the razorpay function shape so the frontend router can swap them transparently.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSTACK_BASE = "https://api.paystack.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const publicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY") || "";

    if (!secretKey) {
      return json({ error: "Paystack not configured. Add PAYSTACK_SECRET_KEY." }, 400);
    }

    const auth = `Bearer ${secretKey}`;

    // Initialize a transaction → returns an authorization_url for the hosted Paystack checkout.
    if (action === "initialize_transaction") {
      const { amount, currency, email, callback_url, metadata, reference } = body;
      if (!email) return json({ error: "email is required" }, 400);
      const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100), // kobo
          currency: currency || "NGN",
          email,
          callback_url,
          metadata: metadata || {},
          reference: reference || `ref_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status === false) {
        return json({ error: data.message || "Paystack init failed", details: data }, 400);
      }
      return json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
        public_key: publicKey,
      });
    }

    // Verify a transaction by reference (called after redirect or inline callback).
    if (action === "verify_transaction") {
      const { reference } = body;
      if (!reference) return json({ error: "reference is required" }, 400);
      const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (!res.ok || data.status === false) {
        return json({ error: data.message || "Verification failed", details: data }, 400);
      }
      const verified = data.data?.status === "success";
      return json({
        verified,
        status: data.data?.status,
        amount: (data.data?.amount || 0) / 100,
        currency: data.data?.currency,
        reference: data.data?.reference,
        gateway_response: data.data?.gateway_response,
        channel: data.data?.channel,
        paid_at: data.data?.paid_at,
      });
    }

    if (action === "create_refund") {
      const { transaction_reference, amount, reason } = body;
      const res = await fetch(`${PAYSTACK_BASE}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({
          transaction: transaction_reference,
          amount: amount ? Math.round(Number(amount) * 100) : undefined,
          merchant_note: reason || "Refund",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status === false) {
        return json({ error: data.message || "Refund failed", details: data }, 400);
      }
      return json({
        refund_id: data.data?.id,
        status: data.data?.status,
        amount: (data.data?.amount || 0) / 100,
      });
    }

    if (action === "fetch_transaction") {
      const { transaction_id } = body;
      const res = await fetch(`${PAYSTACK_BASE}/transaction/${transaction_id}`, {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      if (!res.ok || data.status === false) {
        return json({ error: data.message || "Fetch failed" }, 400);
      }
      return json(data.data);
    }

    return json({ error: `Invalid action: ${action}` }, 400);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
