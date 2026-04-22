// Razorpay checkout — uses the native Capacitor plugin on Android/iOS
// (so installed UPI apps like GPay/PhonePe/Paytm appear in the picker)
// and falls back to the web checkout.js inside browsers.

import { Capacitor } from "@capacitor/core";
import type { FoodPaymentMethod } from "@/components/food/PaymentMethodPicker";

declare global {
  interface Window { Razorpay: any }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Failed to load Razorpay")); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface RazorpayOpenOpts {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  method: FoodPaymentMethod;
  notes?: Record<string, string>;
}

export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Razorpay's `notes` field accepts STRING values only — passing numbers/booleans
// causes the native Android SDK to reject the order with a generic error.
function stringifyNotes(notes?: Record<string, unknown>): Record<string, string> {
  if (!notes) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(notes)) {
    if (v === null || v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

// User-cancellation can come back as many shapes from the native plugin —
// normalise so callers get a single recognisable signal.
function isCancellation(err: any): boolean {
  const msg = String(err?.message || err?.description || err || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('payment_cancelled') ||
    msg.includes('user closed') ||
    code === 'payment_cancelled' ||
    code === 'cancelled'
  );
}

/** Native Capacitor flow — uses Android/iOS Razorpay SDK so installed UPI apps appear */
async function openNative(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  const { Checkout } = await import("capacitor-razorpay");
  const options: any = {
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency || "INR",
    name: opts.name || "Planext4u",
    description: opts.description || "Order",
    order_id: opts.orderId,
    prefill: {
      name: opts.prefill?.name || "",
      email: opts.prefill?.email || "",
      contact: opts.prefill?.contact || "",
    },
    notes: stringifyNotes(opts.notes),
    theme: { color: "#0d9488" },
    // No `method` restriction — show full UPI app picker + all enabled options.
  };

  let result: any;
  try {
    result = await Checkout.open(options);
  } catch (e: any) {
    if (isCancellation(e)) throw new Error("Payment cancelled");
    // Surface the native plugin's actual description rather than a generic error.
    const detail = e?.description || e?.message || e?.code || "Payment could not be completed";
    throw new Error(String(detail));
  }

  const payload = result?.response || result;
  if (!payload?.razorpay_payment_id) {
    throw new Error("Payment cancelled");
  }
  return {
    razorpay_payment_id: payload.razorpay_payment_id,
    razorpay_order_id: payload.razorpay_order_id || opts.orderId,
    razorpay_signature: payload.razorpay_signature,
  };
}

/** Web fallback — opens the standard Razorpay checkout modal in browsers */
async function openWeb(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rp = new window.Razorpay({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency || "INR",
      name: opts.name || "Planext4u",
      description: opts.description || "Order",
      prefill: opts.prefill || {},
      notes: stringifyNotes(opts.notes),
      theme: { color: "#0d9488" },
      handler: (resp: RazorpayResult) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rp.on("payment.failed", (resp: any) => {
      const detail = resp?.error?.description || resp?.error?.reason || "Payment failed";
      reject(new Error(detail));
    });
    rp.open();
  });
}

export async function openRazorpayCheckout(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await openNative(opts);
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Plugin missing in dev/web build — fall back to web checkout, but never
      // hide a real cancellation behind the fallback.
      if (
        !isCancellation(e) &&
        (msg.includes("not implemented") ||
          msg.includes("Cannot find module") ||
          msg.includes("UNIMPLEMENTED"))
      ) {
        return openWeb(opts);
      }
      throw e;
    }
  }
  return openWeb(opts);
}
