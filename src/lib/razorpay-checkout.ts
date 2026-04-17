// Lightweight Razorpay Web Checkout loader.
// Loads the script on demand and opens the modal with the right method preselected.

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

export async function openRazorpayCheckout(opts: RazorpayOpenOpts): Promise<RazorpayResult> {
  await loadScript();
  return new Promise((resolve, reject) => {
    const methodMap: Record<FoodPaymentMethod, any> = {
      upi: { upi: true },
      card: { card: true },
      netbanking: { netbanking: true },
      wallet: { wallet: true },
      emi: { emi: true, card: true },
      cod: {},
    };
    const rp = new window.Razorpay({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency || "INR",
      name: opts.name || "P4U Food",
      description: opts.description || "Food order",
      prefill: opts.prefill || {},
      notes: opts.notes || {},
      method: methodMap[opts.method] || {},
      theme: { color: "#0d9488" },
      handler: (resp: RazorpayResult) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rp.on("payment.failed", (resp: any) => reject(new Error(resp.error?.description || "Payment failed")));
    rp.open();
  });
}
