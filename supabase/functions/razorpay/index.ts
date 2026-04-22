import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Razorpay restricts notes values to STRINGS only — non-string values cause
// the entire create_order request to fail with a confusing validation error.
function sanitizeNotes(notes: unknown): Record<string, string> {
  if (!notes || typeof notes !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(notes as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[String(k).slice(0, 256)] = String(v).slice(0, 256);
  }
  return out;
}

// Razorpay error responses look like { error: { code, description, reason, ... } }
// Surface the human-readable description back to the client.
async function readRzpError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.description || body?.error?.reason || body?.message || `Razorpay returned ${res.status}`;
  } catch {
    const text = await res.text().catch(() => '');
    return text || `Razorpay returned ${res.status}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return json({ error: 'Payments are not configured. Please contact support.' }, 500);
    }

    const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    if (action === 'create_order') {
      const { amount, currency, notes } = body;
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return json({ error: 'Invalid order amount. Please refresh your cart and try again.' }, 400);
      }
      // Razorpay minimum is ₹1 — anything lower is rejected by their API.
      const amountInPaise = Math.round(numeric * 100);
      if (amountInPaise < 100) {
        return json({ error: 'Order total must be at least ₹1 to pay online.' }, 400);
      }
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: currency || 'INR',
          receipt: `rcpt_${Date.now()}`,
          payment_capture: 1,
          notes: sanitizeNotes(notes),
        }),
      });
      if (!res.ok) {
        return json({ error: await readRzpError(res) }, 400);
      }
      const order = await res.json();
      return json({ order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency });
    }

    if (action === 'verify_payment') {
      const { order_id, payment_id, razorpay_signature } = body;
      if (!order_id || !payment_id || !razorpay_signature) {
        return json({ verified: false, error: 'Missing payment verification fields.' }, 400);
      }
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${order_id}|${payment_id}`));
      const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      return json({ verified: expected === razorpay_signature });
    }

    if (action === 'create_refund') {
      const { payment_id, amount, notes } = body;
      const res = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100),
          speed: 'optimum',
          notes: sanitizeNotes(notes),
        }),
      });
      if (!res.ok) {
        return json({ error: await readRzpError(res) }, 400);
      }
      const refund = await res.json();
      return json({ refund_id: refund.id, status: refund.status, amount: refund.amount });
    }

    if (action === 'fetch_payment') {
      const { payment_id } = body;
      const res = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) {
        return json({ error: await readRzpError(res) }, 400);
      }
      return json(await res.json());
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown payment gateway error';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
