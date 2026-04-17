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

const methodMap: Record<FoodPaymentMethod, any> = {
  upi: { upi: true },
  card: { card: true },
  netbanking: { netbanking: true },
  wallet: { wallet: true },
  emi: { emi: true, card: true },
  cod: {},
};

/** Native Capacitor flow — uses Android/iOS Razorpay SDK so installed UPI apps appear */
async function openNative(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  // Dynamic import keeps the web bundle clean
  const { Checkout } = await import("capacitor-razorpay");
  const options: any = {
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency || "INR",
    name: opts.name || "Planext4u",
    description: opts.description || "Order",
    order_id: opts.orderId,
    prefill: opts.prefill || {},
    notes: opts.notes || {},
    theme: { color: "#0d9488" },
    // Hint to the SDK which method to surface; native SDK still shows full UPI picker
    method: methodMap[opts.method] || {},
  };
  // The plugin returns { response: { razorpay_payment_id, razorpay_order_id, razorpay_signature } }
  const result: any = await Checkout.open(options);
  const payload = result?.response || result;
  if (!payload?.razorpay_payment_id) throw new Error("Payment cancelled");
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
      notes: opts.notes || {},
      method: methodMap[opts.method] || {},
      theme: { color: "#0d9488" },
      handler: (resp: RazorpayResult) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rp.on("payment.failed", (resp: any) =>
      reject(new Error(resp.error?.description || "Payment failed"))
    );
    rp.open();
  });
}

export async function openRazorpayCheckout(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      return await openNative(opts);
    } catch (e: any) {
      // If the plugin isn't installed yet on a dev build, fall back to web checkout
      const msg = String(e?.message || e);
      if (msg.includes("not implemented") || msg.includes("Cannot find module")) {
        return openWeb(opts);
      }
      throw e;
    }
  }
  return openWeb(opts);
}
