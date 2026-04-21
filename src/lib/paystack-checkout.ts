// Paystack checkout — opens the hosted authorization URL returned by the
// `paystack` edge function (action: initialize_transaction). Works on web
// and inside Capacitor (we use Browser plugin on native to avoid in-app
// webview redirect issues). After the user completes payment, we verify
// the reference server-side via action: verify_transaction.

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export interface PaystackOpenOpts {
  amount: number; // major units (e.g., NGN 1500.00)
  currency?: string; // default NGN
  email: string;
  metadata?: Record<string, unknown>;
  reference?: string;
  callback_url?: string;
}

export interface PaystackResult {
  reference: string;
  verified: boolean;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string;
}

async function initialize(opts: PaystackOpenOpts) {
  const { data, error } = await supabase.functions.invoke("paystack", {
    body: {
      action: "initialize_transaction",
      amount: opts.amount,
      currency: opts.currency || "NGN",
      email: opts.email,
      metadata: opts.metadata,
      reference: opts.reference,
      callback_url: opts.callback_url || `${window.location.origin}/payment/paystack-return`,
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { authorization_url: string; reference: string; access_code: string; public_key: string };
}

async function verify(reference: string): Promise<PaystackResult> {
  const { data, error } = await supabase.functions.invoke("paystack", {
    body: { action: "verify_transaction", reference },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  const d = data as any;
  return {
    reference: d.reference,
    verified: !!d.verified,
    amount: d.amount,
    currency: d.currency,
    channel: d.channel,
    paid_at: d.paid_at,
  };
}

/**
 * Opens Paystack checkout, polls until the user returns, then verifies the reference.
 * Resolves with verified=true on success, throws on cancel/failure.
 */
export async function openPaystackCheckout(opts: PaystackOpenOpts): Promise<PaystackResult> {
  const init = await initialize(opts);
  const reference = init.reference;

  if (Capacitor.isNativePlatform()) {
    // Use Capacitor Browser if available; otherwise fall back to window.open
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: init.authorization_url, presentationStyle: "popover" });
      // Wait for user to close the in-app browser, then verify
      await new Promise<void>((resolve) => {
        const sub = Browser.addListener("browserFinished", () => {
          sub.remove();
          resolve();
        });
      });
    } catch {
      window.open(init.authorization_url, "_blank");
    }
  } else {
    // Web: open in a centered popup and poll for closure
    const w = 480;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      init.authorization_url,
      "paystack_checkout",
      `width=${w},height=${h},left=${left},top=${top}`
    );
    if (!popup) {
      // Popup blocked → fallback to same-tab redirect
      window.location.href = init.authorization_url;
      throw new Error("Redirecting to Paystack…");
    }
    await new Promise<void>((resolve) => {
      const t = setInterval(() => {
        if (popup.closed) {
          clearInterval(t);
          resolve();
        }
      }, 500);
    });
  }

  const result = await verify(reference);
  if (!result.verified) throw new Error("Payment was not completed");
  return result;
}
