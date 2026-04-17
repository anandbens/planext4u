import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    if (action === 'create_order') {
      const { amount, currency, notes } = body;
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: currency || 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: notes || {},
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Razorpay error: ${err}` }, 400);
      }
      const order = await res.json();
      return json({ order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency });
    }

    if (action === 'verify_payment') {
      const { order_id, payment_id, razorpay_signature } = body;
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
          amount: Math.round(amount * 100),
          speed: 'optimum',
          notes: notes || {},
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Refund error: ${err}` }, 400);
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
        const err = await res.text();
        return json({ error: err }, 400);
      }
      return json(await res.json());
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
