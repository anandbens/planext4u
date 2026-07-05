/**
 * Namakkal Campaign — automated end-to-end integration tests.
 *
 * These tests exercise the real Lovable Cloud backend RPCs that power the
 * Namakkal launch campaign. They are safe to run repeatedly: no order is
 * created and no redemption slot is consumed against the daily quota.
 *
 * Coverage:
 *   1. Campaign configuration invariants (shared_per_customer + geo + limits).
 *   2. evaluate_coupon_eligibility — new user inside radius → eligible.
 *   3. evaluate_coupon_eligibility — user outside radius → outside_radius.
 *   4. evaluate_coupon_eligibility — cart below min_order_amount → rejected.
 *   5. recommend_coupons_for_cart — surfaces NAMAKKAL100 for new Namakkal users.
 *   6. get_customer_available_coupons — returns campaign for a new Namakkal user.
 *   7. redeem_coupon_code — rejects a synthetic invalid order (guard rails wired).
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL = "https://jhtddsqnpfvjvnfojeea.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodGRkc3FucGZ2anZuZm9qZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTE3NTksImV4cCI6MjA4ODk2Nzc1OX0.ENeCHn70-5_I0tb61rr1q0q-VoI7f2mqcTBoL7yxhP0";

const CAMPAIGN_ID = "fc6e533e-60e5-472f-8db6-5cb9edf8f235";
const SHARED_CODE = "NAMAKKAL100";
const NAMAKKAL = { lat: 11.2189, lng: 78.1674 };
const FAR_AWAY = { lat: 28.6139, lng: 77.209 }; // New Delhi — > 25 km away
const NEW_CUSTOMER_ID = "CUST_TEST_NEW_NAMAKKAL"; // synthetic id, has no orders
const PRODUCT_ID = "PROD0002026";
const VENDOR_ID = "VEND0000184";

async function rpc<T = any>(name: string, body: Record<string, unknown>): Promise<{ status: number; body: T }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : (null as any) };
}

async function selectRest<T = any>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  return (await res.json()) as T;
}

describe("Namakkal Campaign — configuration invariants", () => {
  it("is active, shared_per_customer, geo-radius 25km around Namakkal", async () => {
    const rows: any[] = await selectRest(
      `coupon_campaigns?id=eq.${CAMPAIGN_ID}&select=name,code_mode,shared_code,popup_enabled,popup_target,daily_usage_limit,per_customer_limit,center_lat,center_lng,radius_km,use_geo_radius,first_time_only,is_active,status,discount_type,discount_value,min_order_amount`
    );
    expect(Array.isArray(rows) && rows.length).toBeTruthy();
    const c = rows[0];
    expect(c.is_active).toBe(true);
    expect(c.status).toBe("active");
    expect(c.code_mode).toBe("shared_per_customer");
    expect(c.shared_code).toBe(SHARED_CODE);
    expect(c.popup_enabled).toBe(true);
    expect(c.popup_target).toBe("new_users");
    expect(c.first_time_only).toBe(true);
    expect(Number(c.daily_usage_limit)).toBe(100);
    expect(Number(c.per_customer_limit)).toBe(1);
    expect(c.use_geo_radius).toBe(true);
    expect(Number(c.center_lat)).toBeCloseTo(11.2189, 3);
    expect(Number(c.center_lng)).toBeCloseTo(78.1674, 3);
    expect(Number(c.radius_km)).toBe(25);
    expect(c.discount_type).toBe("flat");
    expect(Number(c.discount_value)).toBe(100);
    expect(Number(c.min_order_amount)).toBe(100);
  });
});

describe("Namakkal Campaign — eligibility", () => {
  it("new user inside Namakkal radius is eligible", async () => {
    const r = await rpc("evaluate_coupon_eligibility", {
      _campaign_id: CAMPAIGN_ID,
      _customer_id: NEW_CUSTOMER_ID,
      _lat: NAMAKKAL.lat,
      _lng: NAMAKKAL.lng,
      _cart_value: 500,
      _quantity: 1,
    });
    expect(r.status).toBe(200);
    expect(r.body?.eligible).toBe(true);
    expect(r.body?.reason).toBe("ok");
  });

  it("user outside 25km radius is rejected with outside_radius", async () => {
    const r = await rpc("evaluate_coupon_eligibility", {
      _campaign_id: CAMPAIGN_ID,
      _customer_id: NEW_CUSTOMER_ID,
      _lat: FAR_AWAY.lat,
      _lng: FAR_AWAY.lng,
      _cart_value: 500,
      _quantity: 1,
    });
    expect(r.body?.eligible).toBe(false);
    expect(r.body?.reason).toBe("outside_radius");
  });

  it("cart below min_order_amount is rejected", async () => {
    const r = await rpc("evaluate_coupon_eligibility", {
      _campaign_id: CAMPAIGN_ID,
      _customer_id: NEW_CUSTOMER_ID,
      _lat: NAMAKKAL.lat,
      _lng: NAMAKKAL.lng,
      _cart_value: 50, // below min (100)
      _quantity: 1,
    });
    expect(r.body?.eligible).toBe(false);
    expect(r.body?.reason).toBe("below_min_order");
  });
});

describe("Namakkal Campaign — recommendation & availability", () => {
  it("recommend_coupons_for_cart surfaces NAMAKKAL100 for a new Namakkal user", async () => {
    const r = await rpc("recommend_coupons_for_cart", {
      _customer_id: NEW_CUSTOMER_ID,
      _cart_items: [{ id: PRODUCT_ID, vendor_id: VENDOR_ID, qty: 1, price: 500 }],
      _subtotal: 500,
      _lat: NAMAKKAL.lat,
      _lng: NAMAKKAL.lng,
      _limit: 10,
    });
    expect(r.status).toBe(200);
    const codes: string[] = (r.body?.coupons ?? []).map((c: any) => c.code);
    expect(codes).toContain(SHARED_CODE);
    const namakkal = r.body.coupons.find((c: any) => c.code === SHARED_CODE);
    expect(Number(namakkal.discount_amount)).toBe(100);
  });

  it("get_customer_available_coupons returns the Namakkal campaign for a new user", async () => {
    const r = await rpc("get_customer_available_coupons", {
      _customer_id: NEW_CUSTOMER_ID,
      _lat: NAMAKKAL.lat,
      _lng: NAMAKKAL.lng,
    });
    expect(r.status).toBe(200);
    const camps = (r.body ?? []).map((x: any) => x.campaign_id);
    expect(camps).toContain(CAMPAIGN_ID);
    const row = (r.body ?? []).find((x: any) => x.campaign_id === CAMPAIGN_ID);
    expect(row?.code).toBe(SHARED_CODE);
  });
});

describe("Namakkal Campaign — redemption guardrails", () => {
  it("redeem_coupon_code rejects a synthetic invalid order (no slot consumed)", async () => {
    const r = await rpc("redeem_coupon_code", {
      _code: SHARED_CODE,
      _customer_id: NEW_CUSTOMER_ID,
      _order_id: "ORDER_DOES_NOT_EXIST_TEST",
      _product_id: PRODUCT_ID,
      _discount_amount: 100,
    });
    expect(r.status).toBe(200);
    // Must NOT report success against a fake order — proves guard paths are wired.
    expect(r.body?.ok).toBeFalsy();
  });
});
