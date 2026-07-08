// API Service Layer - Supabase backed
// All operations go through the Supabase client

import { supabase } from "@/integrations/supabase/client";

// ===== Email helper (SMTP via send-email edge function) =====
function escapeForEmail(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function sendEmail(payload: {
  to: string; subject: string; html?: string; text?: string;
  replyTo?: string; cc?: string | string[]; bcc?: string | string[];
}): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('send-email', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { success: true };
}

// ===== Vendor plan visibility =====
// Resolve effective visibility radius (km) for a vendor's plan.
// Falls back to Basic (2 km) when plan is missing, inactive, or expired.
// city → max(plan.radius, 25 km), state → max(plan.radius, 200 km),
// pan_india / VIP → unlimited. Honours admin-configured radius_km.
export function getEffectiveRadiusKm(plan: any | null | undefined): number {
  if (!plan || plan.is_active === false) return 2; // Basic fallback
  const r = Number(plan.radius_km) || 0;
  switch (plan.visibility_type) {
    case 'pan_india': return Infinity;
    case 'state': return Math.max(r, 200);
    case 'city': return Math.max(r, 25);
    case 'radius_based':
    default: return r > 0 ? r : 2;
  }
}

/**
 * Plan-aware visibility check for a vendor relative to a customer location.
 * - pan_india → always visible
 * - city → same city_id (when both available) else radius fallback
 * - state / radius_based → distance ≤ effective radius
 * - expired / inactive / missing plan → Basic fallback (2km)
 * If the user has no coordinates, we don't filter (return true) — caller decides.
 */
export function isVendorVisibleToCustomer(
  vendor: { shop_latitude?: number | null; shop_longitude?: number | null; city_id?: string | null; plan_id?: string | null; plan_end_date?: string | null } | null | undefined,
  plansMap: Record<string, any>,
  userLat: number,
  userLng: number,
  userCityId?: string | null,
): boolean {
  if (!vendor) return false;
  const planExpired = vendor.plan_end_date && new Date(vendor.plan_end_date) < new Date();
  const plan = vendor.plan_id && !planExpired ? plansMap[vendor.plan_id] : null;
  // Pan-India always visible
  if (plan?.visibility_type === 'pan_india') return true;
  // City visibility: prefer exact city_id match
  if (plan?.visibility_type === 'city' && userCityId && vendor.city_id) {
    return vendor.city_id === userCityId;
  }
  const effRadius = getEffectiveRadiusKm(plan);
  if (effRadius === Infinity) return true;
  if (!userLat || !userLng) return true;
  const sLat = Number(vendor.shop_latitude) || 0;
  const sLng = Number(vendor.shop_longitude) || 0;
  if (!sLat || !sLng) return true;
  const R = 6371;
  const dLat = (sLat - userLat) * Math.PI / 180;
  const dLon = (sLng - userLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist <= effRadius;
}

// Types
export interface User {
  id: string; name: string; mobile: string; email: string;
  city_id: string; area_id: string; latitude: number; longitude: number;
  wallet_points: number; referral_code: string; referred_by: string | null;
  status: 'active' | 'inactive' | 'suspended'; created_at: string;
  occupation?: string;
}

export interface Vendor {
  id: string; name: string; business_name: string; mobile: string; email: string;
  category_id: string; city_id: string; area_id: string;
  commission_rate: number; membership: string;
  status: 'pending' | 'level1_approved' | 'level2_approved' | 'verified' | 'rejected';
  created_at: string; rating?: number; total_products?: number; total_orders?: number; total_revenue?: number;
}

export interface Product {
  id: string; vendor_id: string; category_id: string; title: string; description: string;
  price: number; tax: number; discount: number; max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft' | 'pending_approval' | 'rejected';
  vendor_name?: string; category_name?: string; emoji?: string; image?: string;
  rating?: number; reviews?: number; stock?: number; sales?: number;
  rejection_reason?: string;
  created_at?: string; updated_at?: string;
  short_description?: string; long_description?: string;
  discount_type?: string; inactivation_reason?: string;
  images?: string[]; youtube_video_url?: string;
  tax_slab_id?: string; product_attributes?: any[];
  max_redemption_percentage?: number | null;
  is_available?: boolean; duration_hours?: number; duration_minutes?: number;
  promise_p4u?: string; helpline_number?: string;
  thumbnail_image?: string; banner_image?: string;
  subcategory_id?: string; subcategory_name?: string;
  product_type?: 'simple' | 'variable' | 'service';
  sku?: string; slug?: string;
  meta_title?: string; meta_description?: string;
  manage_stock?: boolean; stock_status?: string;
  weight?: number; dimensions?: any;
  parent_item_id?: string | null; parent_item_name?: string | null;
  replacement_time?: string;
  is_deal_of_day?: boolean;
}

export interface ProductVariant {
  id: string; product_id: string; sku?: string;
  price: number; compare_at_price?: number;
  stock_quantity: number; stock_status: string;
  weight?: number; dimensions?: any;
  variant_attributes: Record<string, string>;
  image_url?: string; is_active: boolean; sort_order?: number;
  created_at?: string; updated_at?: string;
}

export interface Service {
  id: string; vendor_id: string; category_id: string; title: string; description: string;
  price: number; tax: number; discount: number; max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft' | 'pending_approval' | 'rejected';
  vendor_name?: string; category_name?: string; emoji?: string; image?: string;
  rating?: number; reviews?: number; service_area?: string; duration?: string;
  latitude?: number | null; longitude?: number | null; location_address?: string | null; distance_km?: number | null;
  created_at?: string; updated_at?: string;
  short_description?: string; long_description?: string;
  meta_title?: string; meta_description?: string; slug?: string;
  pricing_slots?: { label: string; duration_minutes: number; price: number }[];
  booking_duration_minutes?: number; max_bookings_per_slot?: number;
  service_duration_minutes?: number;
  subcategory_id?: string | null; subcategory_name?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null; approved_by?: string | null;
}

export interface Order {
  id: string; customer_id: string; vendor_id: string;
  subtotal: number; tax: number; discount: number; points_used: number; total: number;
  status: 'placed' | 'paid' | 'accepted' | 'in_progress' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  created_at: string; updated_at?: string; customer_name?: string; vendor_name?: string;
  items?: { title: string; qty: number; emoji: string; price: number; image?: string; id?: string }[];
  delivery_rating?: number | null; rating_comment?: string | null; rated_at?: string | null;
  payment_reference_id?: string | null; razorpay_order_id?: string | null;
  platform_fee?: number; gst_on_platform_fee?: number;
  shipping_type?: string | null; courier_name?: string | null;
  tracking_number?: string | null; tracking_url?: string | null;
  shipping_notes?: string | null;
  pod_confirmed?: boolean | null; pod_confirmed_at?: string | null;
}

export interface Settlement {
  id: string; vendor_id: string; order_id: string;
  amount: number; commission: number; net_amount: number;
  status: 'pending' | 'eligible' | 'settled' | 'on_hold';
  settled_at: string | null; created_at?: string; vendor_name?: string;
}

export interface ClassifiedAd {
  id: string; title: string; description: string; price: number;
  category: string; city: string; area: string; images: string[];
  user_id: string; status: 'pending' | 'approved' | 'rejected' | 'expired' | 'sold';
  created_at: string; user_name?: string;
}

export interface PointsTransaction {
  id: string; user_id: string; type: 'welcome' | 'referral' | 'order_reward';
  points: number; description: string; created_at: string; user_name?: string;
}

export interface Referral {
  id: string; referrer_id: string; referee_id: string;
  status: 'pending' | 'completed'; points_awarded: number;
  created_at: string; referrer_name?: string; referee_name?: string;
}

export interface Category {
  id: string; name: string; parent_id: string | null; image: string;
  status: 'active' | 'inactive'; count?: number; created_at?: string;
  banner_image?: string; icon?: string; is_trending?: boolean; description?: string;
  display_order?: number; show_on_homepage?: boolean;
  category_type?: 'product' | 'service';
}

export interface Banner {
  id: string; title: string; desktop_image: string; mobile_image: string;
  link: string; priority: number; start_date: string; end_date: string;
  status: 'active' | 'inactive'; subtitle?: string; gradient?: string; created_at?: string;
}

export interface PlatformVariable {
  id: string; key: string; value: string; description: string;
}

export interface Occupation {
  id: string; name: string; status: 'active' | 'inactive'; customer_count: number; created_at: string;
}

export interface City {
  id: string; name: string; state: string; status: 'active' | 'inactive'; area_count: number; created_at: string;
}

export interface Area {
  id: string; name: string; city_id: string; city_name: string; pincode: string; status: 'active' | 'inactive'; created_at: string;
}

export interface TaxConfig {
  id: string; name: string; rate: number; type: 'GST' | 'Cess'; status: 'active' | 'inactive'; applied_to: string; created_at: string;
}

export interface PopupBanner {
  id: string; title: string; description: string; image: string; link: string; status: 'active' | 'inactive'; start_date: string; end_date: string; created_at: string;
}

export interface Advertisement {
  id: string; title: string; advertiser: string; placement: string; type: 'banner' | 'sidebar' | 'sponsored' | 'strip';
  status: 'active' | 'paused' | 'expired'; impressions: number; clicks: number;
  start_date: string; end_date: string; revenue: number; created_at: string;
}

export interface WebsiteQuery {
  id: string; name: string; email: string; phone: string; subject: string; message: string;
  status: 'new' | 'in_progress' | 'resolved'; created_at: string;
}

export interface ReportLog {
  id: string; report_type: string; generated_by: string; format: string;
  status: 'completed' | 'failed' | 'processing'; file_size: string; created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; per_page: number; total_pages: number;
}

export interface DashboardStats {
  total_customers: number; total_vendors: number; total_orders: number; total_revenue: number;
  pending_settlements: number; active_ads: number; total_services: number;
  customers_trend: number; vendors_trend: number; orders_trend: number; revenue_trend: number;
  recent_orders: Order[];
  revenue_chart: { date: string; revenue: number; orders: number }[];
  top_vendors: { name: string; revenue: number; orders: number }[];
  category_distribution: { name: string; count: number }[];
}

export interface CartItem {
  id: string; title: string; price: number; qty: number; vendor: string;
  vendor_id: string; emoji: string; image?: string; maxPoints: number; tax: number; discount: number;
  parent_item_id?: string | null;
  selected_attributes?: Record<string, string>;
  variant_id?: string;
}

// ===== Narrow column projections for high-traffic list fetches =====
// Response shapes preserved: these lists cover every field consumers currently
// read from Product/Order rows (verified against Product/Order interfaces above,
// admin modals, customer pages, and OrdersPage/ProductsPage filter logic).
// Single-row detail fetches keep `select('*')` since payload doesn't matter there.
const PRODUCT_LIST_COLS_FULL = [
  'id', 'vendor_id', 'category_id', 'subcategory_id', 'subcategory_name',
  'title', 'description', 'short_description', 'long_description',
  'price', 'tax', 'discount', 'discount_type', 'max_points_redeemable',
  'max_redemption_percentage', 'status', 'vendor_name', 'category_name',
  'emoji', 'image', 'images', 'thumbnail_image', 'banner_image',
  'rating', 'reviews', 'stock', 'sales', 'rejection_reason', 'inactivation_reason',
  'created_at', 'updated_at', 'youtube_video_url', 'tax_slab_id',
  'product_attributes', 'is_available', 'duration_hours', 'duration_minutes',
  'promise_p4u', 'helpline_number', 'product_type', 'sku', 'slug',
  'meta_title', 'meta_description', 'manage_stock', 'stock_status',
  'weight', 'dimensions', 'parent_item_id', 'parent_item_name',
  'replacement_time', 'is_deal_of_day',
].join(',');

const ORDER_LIST_COLS_FULL = [
  'id', 'customer_id', 'vendor_id', 'subtotal', 'tax', 'discount', 'points_used',
  'total', 'status', 'created_at', 'updated_at', 'customer_name', 'vendor_name',
  'items', 'delivery_rating', 'rating_comment', 'rated_at',
  'payment_reference_id', 'razorpay_order_id', 'platform_fee', 'gst_on_platform_fee',
  'shipping_type', 'courier_name', 'tracking_number', 'tracking_url',
  'shipping_notes', 'pod_confirmed', 'pod_confirmed_at', 'deleted_at',
].join(',');

// Aggregate-only projection: dashboards and reports that need row-level totals but
// never render or hydrate a full Order object.
const ORDER_AGG_COLS = 'id,status,total,tax,created_at,customer_name,vendor_name';

// Auth token management (kept for backwards compat but not used for Supabase)
export const setAuthToken = (_token: string | null) => {};


// Helper: paginate from Supabase query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paginateResult(data: any[], count: number, page: number, perPage: number): any {
  return {
    data,
    total: count,
    page,
    per_page: perPage,
    total_pages: Math.ceil(count / perPage),
  };
}

function genId(prefix: string, length: number = 3): string {
  return `${prefix}-${String(Math.floor(Math.random() * 999) + 1).padStart(length, '0')}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * services.category_id has an FK to service_categories(id). The unified
 * `categories` table (category_type='service') is also surfaced in admin UIs.
 * Before inserting/updating a service, mirror the chosen id into service_categories
 * if it doesn't already exist there, so the FK constraint is satisfied.
 */
async function ensureServiceCategoryMirrored(id: string | null | undefined, parentId: string | null | undefined): Promise<void> {
  if (!id) return;
  const { data: existing } = await supabase.from('service_categories').select('id').eq('id', id).maybeSingle();
  if (existing) return;
  const { data: cat } = await supabase
    .from('categories' as any)
    .select('id, name, parent_id, image, icon, description, status')
    .eq('id', id)
    .maybeSingle();
  if (!cat) return;
  const effectiveParent = parentId || (cat as any).parent_id || null;
  if (effectiveParent) await ensureServiceCategoryMirrored(effectiveParent, null);
  await supabase.from('service_categories').insert({
    id: (cat as any).id,
    name: (cat as any).name,
    parent_id: effectiveParent,
    image: (cat as any).image || null,
    icon: (cat as any).icon || null,
    description: (cat as any).description || null,
    status: (cat as any).status || 'active',
    count: 0,
  } as any);
}

// API Methods
export const api = {
  // Auth
  login: async (email: string, _password: string) => {
    return { token: 'supabase-session', user: { id: '1', name: 'Admin', email } };
  },

  // Customer Registration
  registerCustomer: async (data: { name: string; mobile: string; email: string; city: string; area: string; referral_code?: string; occupation?: string }) => {
    const newId = genId('USR');
    const now = new Date().toISOString();
    const seqNum = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    const refCode = `MRCP4U${seqNum}`;

    const { error } = await supabase.from('customers').insert({
      id: newId, name: data.name, mobile: data.mobile, email: data.email,
      city_id: "1", area_id: "1", latitude: 19.076, longitude: 72.877,
      wallet_points: 200, referral_code: refCode,
      referred_by: data.referral_code || null, status: "active",
      occupation: data.occupation || "",
    });
    if (error) throw error;

    // Add welcome points
    await supabase.from('points_transactions').insert({
      id: genId('PT'), user_id: newId, type: "welcome", points: 200,
      description: "Welcome bonus on registration", user_name: data.name,
    });

    // Refer & Earn: do NOT credit points at signup.
    // The referrer is rewarded only after the referee completes their first order
    // (handled by DB trigger credit_referral_on_first_delivery, which awards 1 point
    // and is idempotent per referee). We only stamp referred_by on the customer record.

    return { success: true, user: { id: newId, name: data.name }, token: 'session' };
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [
      { count: totalCustomers },
      { count: totalVendors },
      { count: totalServiceVendors },
      { data: orders },
      { data: settlements },
      { data: classifieds },
      { count: totalServices },
      { data: categories },
      { data: serviceCategories },
      { data: allVendors },
      { data: allSvcVendors },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
      supabase.from('service_vendors').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select(ORDER_LIST_COLS_FULL).returns<Order[]>(),
      supabase.from('settlements').select('id,status').returns<{ id: string; status: string }[]>(),
      supabase.from('classified_ads').select('id').eq('status', 'approved').returns<{ id: string }[]>(),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('name, count'),
      supabase.from('service_categories').select('name, count'),
      supabase.from('vendors').select('business_name, total_revenue, total_orders').not('total_revenue', 'is', null).order('total_revenue', { ascending: false }).limit(5),
      supabase.from('service_vendors').select('business_name, total_revenue, total_orders').not('total_revenue', 'is', null).order('total_revenue', { ascending: false }).limit(5),
    ]);

    const allOrders = orders || [];
    const totalRevenue = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);

    return {
      total_customers: totalCustomers || 0,
      total_vendors: (totalVendors || 0) + (totalServiceVendors || 0),
      total_orders: allOrders.length,
      total_revenue: totalRevenue,
      pending_settlements: (settlements || []).filter(s => s.status === 'pending').length,
      active_ads: (classifieds || []).length,
      total_services: totalServices || 0,
      customers_trend: 12.5, vendors_trend: 8.3, orders_trend: 15.2, revenue_trend: 22.1,
      recent_orders: (allOrders.slice(0, 5) as any) as Order[],
      revenue_chart: [
        { date: '2026-03-07', revenue: 185000, orders: 320 },
        { date: '2026-03-08', revenue: 210000, orders: 345 },
        { date: '2026-03-09', revenue: 195000, orders: 310 },
        { date: '2026-03-10', revenue: 240000, orders: 380 },
        { date: '2026-03-11', revenue: 275000, orders: 420 },
        { date: '2026-03-12', revenue: 260000, orders: 395 },
        { date: '2026-03-13', revenue: 290000, orders: 445 },
      ],
      top_vendors: [...(allVendors || []), ...(allSvcVendors || [])].map(v => ({
        name: v.business_name, revenue: Number(v.total_revenue) || 0, orders: v.total_orders || 0,
      })),
      category_distribution: [...(categories || []), ...(serviceCategories || [])].map(c => ({ name: c.name, count: c.count || 0 })),
    };
  },

  // Customers
  getCustomers: async (params: { page?: number; per_page?: number; search?: string; status?: string; occupation?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('customers').select('*', { count: 'exact' }).is('deleted_at', null);
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,mobile.ilike.%${params.search}%,occupation.ilike.%${params.search}%`);
    }
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.occupation) query = query.eq('occupation', params.occupation);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  updateCustomer: async (id: string, data: Partial<User>) => {
    const validFields = ['name', 'email', 'mobile', 'city_id', 'area_id', 'latitude', 'longitude',
      'wallet_points', 'referral_code', 'referred_by', 'status', 'occupation', 'dob', 'gender',
      'about', 'profile_photo', 'kyc_status', 'profile_completeness'];
    const filtered: Record<string, any> = {};
    for (const key of validFields) {
      if (key in data) filtered[key] = (data as any)[key];
    }

    // Mobile: allow exactly 10 digits (strip spaces/dashes/leading country code)
    if ('mobile' in filtered) {
      const raw = String(filtered.mobile ?? '').trim();
      if (raw.length > 0) {
        let digits = raw.replace(/\D/g, '');
        if (digits.length > 10) digits = digits.slice(-10);
        if (!/^\d{10}$/.test(digits)) {
          throw new Error("Mobile number must be exactly 10 digits.");
        }
        filtered.mobile = digits;
      }
    }
    if ('email' in filtered && typeof filtered.email === 'string') {
      filtered.email = filtered.email.trim().toLowerCase();
    }

    // Duplicate detection within the customers table (excluding this customer & soft-deleted rows)
    if (filtered.email) {
      const { data: dup } = await supabase
        .from('customers').select('id').eq('email', filtered.email).neq('id', id).is('deleted_at', null).limit(1);
      if (dup && dup.length > 0) throw new Error("This email is already used by another customer.");
    }
    if (filtered.mobile) {
      const { data: dup } = await supabase
        .from('customers').select('id').eq('mobile', filtered.mobile).neq('id', id).is('deleted_at', null).limit(1);
      if (dup && dup.length > 0) throw new Error("This mobile number is already used by another customer.");
    }

    const { error } = await supabase.from('customers').update(filtered).eq('id', id);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        if (msg.includes('mobile')) throw new Error("This mobile number is already in use.");
        if (msg.includes('email')) throw new Error("This email is already in use.");
      }
      throw error;
    }
    return { success: true };
  },

  createCustomer: async (data: Partial<User>) => {
    // Welcome bonus is configured via platform_variables. Canonical key is
    // 'WELCOME_BONUS' (uppercase) — kept in sync with admin Platform Variables.
    // We also accept the legacy lowercase 'welcome_points' as a fallback.
    let welcomePoints = 300;
    try {
      const { data: pv } = await supabase
        .from('platform_variables')
        .select('key, value')
        .in('key', ['WELCOME_BONUS', 'welcome_points']);
      const map = new Map((pv || []).map((r: any) => [r.key, r.value]));
      const raw = map.get('WELCOME_BONUS') ?? map.get('welcome_points');
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed > 0) welcomePoints = parsed;
    } catch { /* keep default */ }

    const newId = genId('USR');
    const initialPoints = (data.wallet_points != null) ? Number(data.wallet_points) : welcomePoints;

    // Friendly duplicate-check before insert
    const mobile = (data.mobile || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    if (mobile) {
      const { data: dupCM } = await supabase.from('customers').select('id').eq('mobile', mobile).neq('status', 'deleted').maybeSingle();
      if (dupCM) throw new Error(`This mobile number (${mobile}) is already registered with another customer.`);
      const { data: dupVM } = await supabase.from('vendors').select('id').eq('mobile', mobile).maybeSingle();
      if (dupVM) throw new Error(`This mobile number (${mobile}) is already registered as a vendor.`);
    }
    if (email) {
      const { data: dupCE } = await supabase.from('customers').select('id').ilike('email', email).neq('status', 'deleted').maybeSingle();
      if (dupCE) throw new Error(`This email (${email}) is already registered with another customer.`);
      const { data: dupVE } = await supabase.from('vendors').select('id').ilike('email', email).maybeSingle();
      if (dupVE) throw new Error(`This email (${email}) is already registered as a vendor.`);
    }

    // city_id / area_id must reference existing rows in cities/areas (FK).
    // Fall back to the seeded "UNCATEGORIZED" rows when the admin doesn't pick one.
    const FALLBACK_CITY_ID = 'CTY0000000';
    const FALLBACK_AREA_ID = 'ARE0000000';
    const pickedCity = (data.city_id && String(data.city_id).trim() && String(data.city_id) !== '1') ? data.city_id : FALLBACK_CITY_ID;
    const pickedArea = (data.area_id && String(data.area_id).trim() && String(data.area_id) !== '1') ? data.area_id : FALLBACK_AREA_ID;

    const newCustomer = {
      id: newId,
      name: data.name || '',
      email: data.email || '',
      mobile: data.mobile || '',
      city_id: pickedCity,
      area_id: pickedArea,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      wallet_points: initialPoints,
      referral_code: `MRCP4U${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      referred_by: data.referred_by || null,
      status: data.status || 'active',
      occupation: data.occupation || '',
    };
    const { error } = await supabase.from('customers').insert(newCustomer);
    if (error) {
      if ((error as any).code === '23505') {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('mobile')) throw new Error('This mobile number is already registered.');
        if (msg.includes('email')) throw new Error('This email is already registered.');
        throw new Error('A customer with these details already exists.');
      }
      throw error;
    }

    // Record the welcome bonus in points_transactions so it shows under Wallet/Points history
    if (initialPoints > 0) {
      try {
        await supabase.from('points_transactions').insert({
          id: genId('PT'),
          user_id: newId,
          type: 'welcome',
          points: initialPoints,
          description: 'Welcome bonus on registration',
          user_name: newCustomer.name,
        });
      } catch (e) {
        console.warn('Welcome bonus transaction insert failed (customer still created):', e);
      }
    }

    return { success: true, customer: newCustomer };
  },

  deleteCustomer: async (id: string) => {
    // Soft delete: append _DEL_<timestamp> to unique fields, set status to deleted
    const ts = Date.now().toString();
    const { data: cust } = await supabase.from('customers').select('email, mobile, referral_code').eq('id', id).single();
    const updates: Record<string, any> = {
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      email: cust?.email ? `${cust.email}_DEL_${ts}` : `deleted_${ts}`,
      mobile: cust?.mobile ? `${cust.mobile}_DEL_${ts}` : `deleted_${ts}`,
      referral_code: cust?.referral_code ? `${cust.referral_code}_DEL_${ts}` : `deleted_${ts}`,
    };
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) throw error;
    await supabase.from('audit_logs').insert({
      table_name: 'customers', operation: 'SOFT_DELETE', record_id: id,
      old_data: cust, new_data: updates,
    });
    return { success: true };
  },

  // Vendors — PRODUCT vendors only. Service vendors live in `service_vendors`
  // and are managed exclusively from the Service Vendors page.
  getVendors: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string; payment_status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let vQuery = supabase
      .from('vendors')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .or('vendor_category.eq.product,vendor_category.is.null');
    if (params.search) vQuery = vQuery.or(`name.ilike.%${params.search}%,business_name.ilike.%${params.search}%,email.ilike.%${params.search}%,mobile.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') vQuery = vQuery.eq('status', params.status);
    if (params.payment_status && params.payment_status !== 'all') vQuery = vQuery.eq('plan_payment_status', params.payment_status);
    if (params.date_from) vQuery = vQuery.gte('created_at', params.date_from);
    if (params.date_to) vQuery = vQuery.lte('created_at', params.date_to + 'T23:59:59Z');
    vQuery = vQuery.order('created_at', { ascending: false }).range(from, to);

    const { data: vendors, count } = await vQuery;
    return paginateResult(vendors || [], count || 0, page, perPage);
  },

  updateVendorStatus: async (id: string, status: string) => {
    const { error: e1 } = await supabase.from('vendors').update({ status }).eq('id', id);
    if (e1) {
      const { error: e2 } = await supabase.from('service_vendors').update({ status }).eq('id', id);
      if (e2) throw e2;
    }
    return { success: true };
  },

  updateVendor: async (id: string, data: Partial<Vendor>) => {
    // Valid columns for the `vendors` table
    const validVendorFields = ['name', 'business_name', 'mobile', 'email', 'category_id', 'city_id', 'area_id',
      'commission_rate', 'membership', 'status', 'rating', 'total_products', 'total_orders', 'total_revenue',
      'shop_latitude', 'shop_longitude', 'shop_address', 'plan_id', 'plan_start_date', 'plan_end_date',
      'plan_payment_status', 'plan_transaction_id', 'shop_photo_url', 'background_image', 'max_redemption_percentage', 'referred_by',
      'gstin', 'pan', 'state_name', 'state_code'];
    // UUID columns that must be null instead of empty string
    const uuidFields = ['plan_id', 'category_id', 'city_id', 'area_id'];
    // Valid columns for the `service_vendors` table (now includes plan/shop/payment cols)
    const validSvcVendorFields = ['name', 'business_name', 'mobile', 'email', 'category_id', 'city_id', 'area_id',
      'commission_rate', 'membership', 'status', 'rating', 'total_products', 'total_orders', 'total_revenue',
      'plan_id', 'plan_payment_status', 'plan_transaction_id', 'shop_photo_url', 'max_redemption_percentage', 'kyc_status', 'referred_by',
      'shop_latitude', 'shop_longitude', 'shop_address', 'background_image', 'plan_start_date', 'plan_end_date',
      'gstin', 'pan', 'state_name', 'state_code'];

    // ── Mobile validation: exactly 10 digits ───────────────────────────────
    if ('mobile' in data) {
      const raw = String((data as any).mobile ?? '').trim();
      if (raw.length > 0) {
        let digits = raw.replace(/\D/g, '');
        if (digits.length > 10) digits = digits.slice(-10);
        if (!/^\d{10}$/.test(digits)) {
          throw new Error("Mobile number must be exactly 10 digits.");
        }
        (data as any).mobile = digits;
      }
    }
    if ('email' in data && typeof (data as any).email === 'string') {
      (data as any).email = (data as any).email.trim().toLowerCase();
    }

    // ── Duplicate detection across BOTH vendor tables ──────────────────────
    // Only check when the value actually changes — otherwise an unchanged mobile/email
    // on a vendor that exists in both tables (or has any historical duplicate row)
    // would falsely trip the "already in use" guard and block the update.
    const [{ data: curV }, { data: curSV }] = await Promise.all([
      supabase.from('vendors').select('email, mobile').eq('id', id).maybeSingle(),
      supabase.from('service_vendors').select('email, mobile').eq('id', id).maybeSingle(),
    ]);
    const existing = curV || curSV;
    const newEmail = (data as any).email;
    const newMobile = (data as any).mobile;
    const emailChanged = newEmail && existing && String(existing.email || '').toLowerCase() !== String(newEmail).toLowerCase();
    const mobileChanged = newMobile && existing && String(existing.mobile || '') !== String(newMobile);

    if (newEmail && (!existing || emailChanged)) {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('vendors').select('id').eq('email', newEmail).neq('id', id).is('deleted_at', null).limit(1),
        supabase.from('service_vendors').select('id').eq('email', newEmail).neq('id', id).limit(1),
      ]);
      if ((a && a.length) || (b && b.length)) {
        throw new Error("This email is already used by another vendor.");
      }
    }
    if (newMobile && (!existing || mobileChanged)) {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('vendors').select('id').eq('mobile', newMobile).neq('id', id).is('deleted_at', null).limit(1),
        supabase.from('service_vendors').select('id').eq('mobile', newMobile).neq('id', id).limit(1),
      ]);
      if ((a && a.length) || (b && b.length)) {
        throw new Error("This mobile number is already used by another vendor.");
      }
    }

    const buildFiltered = (allowed: string[]) => {
      const out: Record<string, any> = {};
      for (const key of allowed) {
        if (key in data) {
          let val = (data as any)[key];
          if (uuidFields.includes(key) && val === '') val = null;
          out[key] = val;
        }
      }
      return out;
    };

    const friendlyDup = (err: any) => {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        if (msg.includes('mobile')) return new Error("This mobile number is already in use.");
        if (msg.includes('email')) return new Error("This email is already in use.");
      }
      return err;
    };

    // Detect which table this id belongs to (IDs may be SVN-* for service vendors, VND-* for product vendors)
    // Important: if vendors update returns 0 rows AND no error, fall through to service_vendors instead of throwing.
    const filtered = buildFiltered(validVendorFields);
    const { data: updated, error: e1 } = await supabase.from('vendors').update(filtered).eq('id', id).select();
    if (e1) throw friendlyDup(e1);
    if (updated && updated.length > 0) return { success: true };

    // No rows matched — try service_vendors as a fallback
    const svcFiltered = buildFiltered(validSvcVendorFields);
    const { data: svcUpdated, error: e2 } = await supabase.from('service_vendors').update(svcFiltered).eq('id', id).select();
    if (e2) {
      console.error("Service vendor update error:", e2);
      throw friendlyDup(e2);
    }
    if (!svcUpdated || svcUpdated.length === 0) {
      throw new Error("Update failed — no matching vendor row was updated. Check the vendor ID and your permissions.");
    }
    return { success: true };
  },

  createVendor: async (data: Partial<Vendor>, type: 'product' | 'service' = 'product') => {
    const table = type === 'service' ? 'service_vendors' : 'vendors';
    // Pre-flight: must have an authenticated admin session, otherwise RLS will reject the insert
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in as an admin to create a vendor.");
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'finance', 'sales']);
    if (!roles || roles.length === 0) throw new Error("Only admin users can create vendors.");

    // Validate required fields
    if (!data.name?.trim()) throw new Error("Owner name is required");
    if (!data.business_name?.trim()) throw new Error("Business name is required");
    if (!data.mobile?.trim()) throw new Error("Mobile is required");
    if (!data.email?.trim()) throw new Error("Email is required");

    // Duplicate check across both tables (cross-vendor uniqueness)
    const cleanedMobile = data.mobile.replace(/\D/g, '');
    const mobileNorm = cleanedMobile.length === 10 ? `+91${cleanedMobile}` : data.mobile;
    const lowerEmail = data.email.toLowerCase().trim();
    const [vDup, svDup] = await Promise.all([
      supabase.from('vendors').select('id').or(`mobile.eq.${mobileNorm},mobile.eq.${cleanedMobile},email.eq.${lowerEmail}`).is('deleted_at', null).limit(1),
      supabase.from('service_vendors').select('id').or(`mobile.eq.${mobileNorm},mobile.eq.${cleanedMobile},email.eq.${lowerEmail}`).limit(1),
    ]);
    if ((vDup.data && vDup.data.length) || (svDup.data && svDup.data.length)) {
      throw new Error("A vendor with this mobile or email already exists.");
    }

    const newVendor: Record<string, any> = {
      id: genId(type === 'service' ? 'SVN' : 'VND'),
      name: data.name.trim(),
      business_name: data.business_name.trim(),
      mobile: mobileNorm,
      email: lowerEmail,
      commission_rate: Number(data.commission_rate) || 0,
      membership: data.membership || 'basic',
      status: data.status || 'verified',
      vendor_category: type === 'service' ? 'service' : 'product',
      total_products: 0, total_orders: 0, total_revenue: 0,
    };
    if ((data as any).category_id) newVendor.category_id = (data as any).category_id;
    // FK columns must reference an existing row. Resolve city/area against the DB,
    // and silently fall back to the seeded UNCATEGORIZED placeholder if the picked id
    // does not exist (or the form sent a legacy value like "1").
    // Resolve city/area FKs. If the supplied id doesn't exist, fall back to the
    // seeded UNCATEGORIZED placeholder. If even that doesn't exist (or the read
    // is blocked), leave the column NULL so the FK constraint is never violated.
    const resolveFk = async (table: 'cities' | 'areas', id: any, fallback: string): Promise<string | null> => {
      const candidate = typeof id === 'string' ? id.trim() : '';
      if (candidate) {
        const { data: row } = await supabase.from(table).select('id').eq('id', candidate).maybeSingle();
        if (row?.id) return row.id;
      }
      const { data: fb } = await supabase.from(table).select('id').eq('id', fallback).maybeSingle();
      return fb?.id ?? null;
    };
    const safeCityId = await resolveFk('cities', (data as any).city_id, 'CTY0000000');
    const safeAreaId = await resolveFk('areas', (data as any).area_id, 'ARE0000000');
    // Always include the column — set to null when no valid FK target was found
    // so we never accidentally insert a stale id from the form state.
    newVendor.city_id = safeCityId;
    newVendor.area_id = safeAreaId;
    if ((data as any).plan_id) newVendor.plan_id = (data as any).plan_id;
    if ((data as any).max_redemption_percentage != null) newVendor.max_redemption_percentage = (data as any).max_redemption_percentage;
    if ((data as any).shop_photo_url) newVendor.shop_photo_url = (data as any).shop_photo_url;
    if (type === 'product') {
      if ((data as any).plan_payment_status) newVendor.plan_payment_status = (data as any).plan_payment_status;
    }
    const { error } = await supabase.from(table).insert(newVendor as any);
    if (error) throw error;

    // Create an auth account + user_roles link so this admin-registered vendor
    // can immediately sign in to the vendor portal and pass RLS on inserts.
    let tempPassword: string | null = null;
    try {
      const { data: linkData, error: linkErr } = await supabase.functions.invoke(
        "admin-create-vendor-auth",
        {
          body: {
            vendor_id: newVendor.id,
            email: newVendor.email,
            mobile: newVendor.mobile,
            name: newVendor.name,
          },
        },
      );
      if (linkErr) {
        console.warn("[createVendor] auth link failed:", linkErr);
      } else if (linkData?.temp_password) {
        tempPassword = linkData.temp_password as string;
      }
    } catch (e) {
      console.warn("[createVendor] auth link threw:", e);
    }

    return { success: true, vendor: newVendor, temp_password: tempPassword };
  },

  deleteVendor: async (id: string) => {
    // Soft delete: append _DEL_<timestamp> to unique fields
    const ts = Date.now().toString();
    // Try vendors table first
    const { data: vend } = await supabase.from('vendors').select('email, mobile').eq('id', id).maybeSingle();
    if (vend) {
      const updates: Record<string, any> = {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        email: vend.email ? `${vend.email}_DEL_${ts}` : `deleted_${ts}`,
        mobile: vend.mobile ? `${vend.mobile}_DEL_${ts}` : `deleted_${ts}`,
      };
      const { error } = await supabase.from('vendors').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        table_name: 'vendors', operation: 'SOFT_DELETE', record_id: id,
        old_data: vend, new_data: updates,
      });
    } else {
      // Try service_vendors
      const { data: sv } = await supabase.from('service_vendors').select('email, mobile').eq('id', id).maybeSingle();
      if (!sv) throw new Error('Vendor not found');
      const updates: Record<string, any> = {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        email: sv?.email ? `${sv.email}_DEL_${ts}` : `deleted_${ts}`,
        mobile: sv?.mobile ? `${sv.mobile}_DEL_${ts}` : `deleted_${ts}`,
      };
      const { error } = await supabase.from('service_vendors').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        table_name: 'service_vendors', operation: 'SOFT_DELETE', record_id: id,
        old_data: sv, new_data: updates,
      });
    }
    return { success: true };
  },

  // Products
  getProducts: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('products').select(PRODUCT_LIST_COLS_FULL, { count: 'exact' });
    if (params.search) query = query.or(`title.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%,category_name.ilike.%${params.search}%`);
    if (params.status) query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    // Filter to only valid product table columns
    const validProductFields = ['title', 'description', 'short_description', 'long_description', 'price', 'tax', 'discount',
      'discount_type', 'max_points_redeemable', 'status', 'vendor_id', 'vendor_name', 'category_id', 'category_name',
      'subcategory_id', 'subcategory_name', 'stock', 'emoji', 'image', 'images', 'rejection_reason', 'inactivation_reason',
      'youtube_video_url', 'max_redemption_percentage', 'commission_override', 'tax_slab_id', 'product_attributes',
      'is_available', 'duration_hours', 'duration_minutes', 'promise_p4u', 'helpline_number', 'thumbnail_image',
      'banner_image', 'socio_shopping_icon', 'product_type', 'sku', 'slug', 'meta_title', 'meta_description',
      'manage_stock', 'stock_status', 'weight', 'dimensions', 'parent_item_id', 'parent_item_name', 'replacement_time', 'is_deal_of_day'];
    const uuidFields = ['category_id', 'subcategory_id', 'vendor_id', 'tax_slab_id', 'parent_item_id'];
    const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of validProductFields) {
      if (key in data) {
        let val = (data as any)[key];
        if (uuidFields.includes(key) && val === '') val = null;
        filtered[key] = val;
      }
    }
    const { data: updated, error } = await supabase.from('products').update(filtered).eq('id', id).select();
    if (error) { console.error("Product update error:", error); throw error; }
    if (!updated || updated.length === 0) throw new Error("Product update failed — no rows were affected. Check your permissions.");
    return { success: true };
  },

  createProduct: async (data: Partial<Product>) => {
    // Validate required fields before attempting insert
    const errors: string[] = [];
    if (!data.title?.trim()) errors.push("Product title is required");
    if (!data.vendor_id?.trim()) errors.push("Vendor is required");
    if (data.price === undefined || data.price === null || data.price < 0) errors.push("Valid price is required");
    if (!data.description?.trim()) errors.push("Description is required");
    if (errors.length > 0) throw new Error(errors.join(". "));

    const validProductFields = ['title', 'description', 'short_description', 'long_description', 'price', 'tax', 'discount',
      'discount_type', 'max_points_redeemable', 'status', 'vendor_id', 'vendor_name', 'category_id', 'category_name',
      'subcategory_id', 'subcategory_name', 'stock', 'emoji', 'image', 'images', 'rejection_reason',
      'youtube_video_url', 'max_redemption_percentage', 'commission_override', 'tax_slab_id', 'product_attributes',
      'is_available', 'duration_hours', 'duration_minutes', 'promise_p4u', 'helpline_number', 'thumbnail_image',
      'banner_image', 'socio_shopping_icon', 'product_type', 'sku', 'slug', 'meta_title', 'meta_description',
      'manage_stock', 'stock_status', 'weight', 'dimensions', 'parent_item_id', 'parent_item_name', 'replacement_time', 'is_deal_of_day'];
    const newProduct: Record<string, any> = {
      id: genId('PRD'),
      rating: 0, reviews: 0, stock: data.stock || 0, sales: 0,
    };
    for (const key of validProductFields) {
      if (key in data && (data as any)[key] !== undefined) newProduct[key] = (data as any)[key];
    }
    // Admin-created products are auto-approved (active) unless an explicit non-default status was chosen.
    // Vendor-created products go through VendorProductsPage which forces 'pending_approval'.
    if (!newProduct.status || newProduct.status === 'pending_approval' || newProduct.status === 'draft') {
      newProduct.status = 'active';
    }
    // Nullify empty strings for UUID/FK fields to avoid "invalid input syntax for type uuid" errors
    const uuidFields = ['category_id', 'subcategory_id', 'tax_slab_id', 'parent_item_id', 'vendor_id'];
    for (const f of uuidFields) {
      if (newProduct[f] === '' || newProduct[f] === undefined) newProduct[f] = null;
    }
    // Re-check vendor after nullification
    if (!newProduct.vendor_id) throw new Error("Vendor is required. Please select a vendor before creating the product.");
    const { error } = await supabase.from('products').insert(newProduct as any);
    if (error) {
      // Map DB errors to user-friendly messages
      if (error.message?.includes('foreign key') && error.message?.includes('vendor')) throw new Error("Selected vendor is invalid. Please choose a valid vendor.");
      if (error.message?.includes('foreign key') && error.message?.includes('category')) throw new Error("Selected category is invalid. Please choose a valid category.");
      if (error.message?.includes('foreign key') && error.message?.includes('tax_slab')) throw new Error("Selected tax slab is invalid. Please choose a valid tax slab.");
      if (error.message?.includes('uuid')) throw new Error("One of the selected values is invalid. Please check vendor, category, and other dropdown fields.");
      throw new Error("Failed to create product: " + error.message);
    }
    return { success: true, product: newProduct };
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getProductById: async (id: string, opts?: { includeInactive?: boolean }): Promise<Product | null> => {
    let q = supabase.from('products').select('*').eq('id', id);
    if (!opts?.includeInactive) q = q.eq('status', 'active');
    const { data } = await q.maybeSingle();
    return data as any;
  },

  // Services
  getServices: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('services').select('*', { count: 'exact' });
    if (params.search) query = query.or(`title.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%,category_name.ilike.%${params.search}%`);
    if (params.status) query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  getServiceById: async (id: string): Promise<Service | null> => {
    const { data } = await supabase.from('services').select('*').eq('id', id).single();
    return data as any;
  },

  // Resolve effective visibility radius (km) for a vendor plan.
  // Falls back to Basic (2 km) when plan is missing, inactive, or expired.
  // City → 25 km, State → 200 km, Pan-India / VIP → unlimited.
  // Honours admin-configured radius_km when larger than the type default.
  browseServices: async (params: { category?: string; search?: string; sort?: string; userLat?: number; userLng?: number; userCityId?: string | null }) => {
    // Narrow column list: card render + post-processing (vendor filter, distance, sort).
    // Service detail page re-fetches the full row via getServiceById.
    const SERVICE_LIST_COLS = 'id,title,description,image,images,price,discount,rating,reviews,duration,vendor_id,vendor_name,category_id,category_name,subcategory_id,subcategory_name,service_area,latitude,longitude,location_address,status,slug,emoji,created_at';
    let query = supabase.from('services').select(SERVICE_LIST_COLS).eq('status', 'active');
    if (params.category) {
      // Resolve whether the supplied name is a parent service category or a subcategory.
      // - Parent  → match services whose category_name matches (covers all subcategories).
      // - Subcat  → strict match on subcategory_name (or subcategory_id) so siblings don't bleed in.
      const { data: catRow } = await supabase
        .from('service_categories')
        .select('id, name, parent_id, status')
        .ilike('name', params.category)
        .eq('status', 'active')
        .maybeSingle();
      if (catRow?.parent_id) {
        query = query.or(
          `subcategory_name.ilike.${params.category},subcategory_id.eq.${catRow.id}`
        );
      } else {
        query = query.ilike('category_name', `%${params.category}%`);
      }
    }
    if (params.search) {
      const term = params.search.replace(/[%,]/g, '').trim();
      if (term) {
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,category_name.ilike.%${term}%,subcategory_name.ilike.%${term}%,service_area.ilike.%${term}%`);
      }
    }
    if (params.sort === 'price_low') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_high') query = query.order('price', { ascending: false });
    else if (params.sort === 'rating') query = query.order('rating', { ascending: false });

    const { data: services } = await query;
    if (!services?.length) return [] as unknown as Service[];

    // Apply service vendor plan visibility / location filtering (mirrors browseProducts)
    const vendorIds = [...new Set(services.map((s: any) => s.vendor_id).filter(Boolean))];
    if (!vendorIds.length) return services as unknown as Service[];

    const { data: serviceVendors } = await supabase
      .from('service_vendors')
      .select('id, plan_id, shop_address, shop_latitude, shop_longitude, city_id, status')
      .in('id', vendorIds)
      .in('status', ['active', 'verified']);

    const { data: vendorProfiles } = await supabase
      .from('vendors')
      .select('id, plan_id, plan_end_date, shop_address, shop_latitude, shop_longitude, city_id, status')
      .in('id', vendorIds)
      .in('status', ['verified', 'active', 'level2_approved']);

    const vendors = [...(serviceVendors || []), ...(vendorProfiles || [])]
      .reduce((acc: any[], v: any) => acc.some((x) => x.id === v.id) ? acc : [...acc, v], []);

    if (!vendors.length) return [] as unknown as Service[];

    const verifiedVendorIds = new Set(vendors.map((v: any) => v.id));
    const filteredServices = services.filter((s: any) => verifiedVendorIds.has(s.vendor_id));

    const planIds = [...new Set(vendors.filter((v: any) => v.plan_id).map((v: any) => v.plan_id!))];
    const plansMap: Record<string, any> = {};
    if (planIds.length) {
      const { data: plans } = await supabase.from('vendor_plans').select('*').in('id', planIds);
      plans?.forEach((p: any) => { plansMap[p.id] = p; });
    }

    const vendorMap: Record<string, any> = {};
    vendors.forEach((v: any) => { vendorMap[v.id] = v; });

    const userLat = params.userLat ?? 0;
    const userLng = params.userLng ?? 0;

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const getServiceCoords = (service: any, vendor?: any) => {
      const rawLat = Number(service.latitude);
      const rawLng = Number(service.longitude);
      const vendorLat = Number(vendor?.shop_latitude);
      const vendorLng = Number(vendor?.shop_longitude);
      const lat = Number.isFinite(rawLat) && rawLat !== 0 ? rawLat : (Number.isFinite(vendorLat) ? vendorLat : 0);
      const lng = Number.isFinite(rawLng) && rawLng !== 0 ? rawLng : (Number.isFinite(vendorLng) ? vendorLng : 0);
      return { lat, lng };
    };

    const filtered = filteredServices.filter((s: any) => {
      const vendor = vendorMap[s.vendor_id];
      return isVendorVisibleToCustomer(vendor, plansMap, userLat, userLng, (params as any).userCityId);
    });

    // Attach distance (km) from user → vendor shop when we have user coords.
    const withDistance = filtered.map((s: any) => {
      const vendor = vendorMap[s.vendor_id];
      const { lat: sLat, lng: sLng } = getServiceCoords(s, vendor);
      let distance_km: number | null = null;
      if (userLat && userLng && sLat && sLng) {
        distance_km = Math.round(haversine(userLat, userLng, sLat, sLng) * 10) / 10;
      }
      return { ...s, latitude: sLat || s.latitude, longitude: sLng || s.longitude, location_address: s.location_address || vendor?.shop_address || s.service_area, distance_km };
    });

    // When no explicit sort (or "nearest"/"popular"), prioritize closer services.
    // Services without a known distance fall to the bottom.
    if (!params.sort || params.sort === 'popular' || params.sort === 'nearest') {
      if (userLat && userLng) {
        withDistance.sort((a: any, b: any) => {
          const da = a.distance_km ?? Number.POSITIVE_INFINITY;
          const db = b.distance_km ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        });
      }
    }

    return withDistance as unknown as Service[];
  },

  getServiceCategories: async (includeInactive = false) => {
    let q = supabase.from('service_categories').select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (!includeInactive) q = q.eq('status', 'active');
    const { data } = await q;
    return (data || []) as Category[];
  },

  createServiceCategory: async (data: Partial<Category>) => {
    const validFields = ['name', 'parent_id', 'image', 'icon', 'banner_image', 'status',
      'is_trending', 'is_emergency', 'description', 'commission_rate', 'verification_status',
      'promotion_banner_url', 'promotion_title', 'promotion_active',
      'display_order', 'show_on_homepage'];
    const filtered: Record<string, any> = { id: genId('SCAT'), count: 0 };
    for (const key of validFields) {
      if (key in data) {
        let val = (data as any)[key];
        if (key === 'parent_id' && val === '') val = null;
        filtered[key] = val;
      }
    }
    if (!filtered.image) filtered.image = '🛠️';
    const { error } = await supabase.from('service_categories').insert(filtered as any);
    if (error) throw error;
    return { success: true };
  },

  updateServiceCategory: async (id: string, data: Partial<Category>) => {
    const validFields = ['name', 'parent_id', 'image', 'icon', 'banner_image', 'status',
      'is_trending', 'is_emergency', 'description', 'commission_rate', 'verification_status',
      'promotion_banner_url', 'promotion_title', 'promotion_active',
      'display_order', 'show_on_homepage'];
    const filtered: Record<string, any> = {};
    for (const key of validFields) {
      if (key in data) {
        let val = (data as any)[key];
        if (key === 'parent_id' && val === '') val = null;
        filtered[key] = val;
      }
    }
    const { error } = await supabase.from('service_categories').update(filtered).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  deleteServiceCategory: async (id: string) => {
    // Cascade delete subcategories first
    await supabase.from('service_categories').delete().eq('parent_id', id);
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  bulkDeleteServiceCategories: async (ids: string[]) => {
    if (!ids.length) return { success: true };
    await supabase.from('service_categories').delete().in('parent_id', ids);
    const { error } = await supabase.from('service_categories').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  // Orders
  getOrders: async (params: {
    page?: number; per_page?: number; search?: string; status?: string;
    date_from?: string; date_to?: string;
    vendor_type?: 'product' | 'service' | 'all';
    deleted?: boolean;
    vendor_filter?: string;
    product_filter?: string;
    min_amount?: number;
    max_amount?: number;
    customer_filter?: string;
  }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Resolve vendor IDs by type (product = vendors table, service = service_vendors)
    let restrictVendorIds: string[] | null = null;
    if (params.vendor_type === 'product' || params.vendor_type === 'service') {
      const tbl = params.vendor_type === 'product' ? 'vendors' : 'service_vendors';
      let vq = supabase.from(tbl as any).select('id');
      if (params.vendor_filter) vq = vq.or(`id.ilike.%${params.vendor_filter}%,name.ilike.%${params.vendor_filter}%,business_name.ilike.%${params.vendor_filter}%`);
      const { data: vRows } = await vq.limit(2000);
      restrictVendorIds = (vRows || []).map((r: any) => r.id);
      if (restrictVendorIds.length === 0) {
        return paginateResult([], 0, page, perPage);
      }
    } else if (params.vendor_filter) {
      // Without a type filter, search both
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from('vendors').select('id').or(`id.ilike.%${params.vendor_filter}%,name.ilike.%${params.vendor_filter}%,business_name.ilike.%${params.vendor_filter}%`),
        supabase.from('service_vendors').select('id').or(`id.ilike.%${params.vendor_filter}%,name.ilike.%${params.vendor_filter}%,business_name.ilike.%${params.vendor_filter}%`),
      ]);
      restrictVendorIds = [...(a || []).map((r: any) => r.id), ...(b || []).map((r: any) => r.id)];
      if (restrictVendorIds.length === 0) return paginateResult([], 0, page, perPage);
    }

    let query = supabase.from('orders').select(ORDER_LIST_COLS_FULL, { count: 'exact' });

    // Soft-delete filter
    if (params.deleted) query = query.not('deleted_at', 'is', null);
    else query = query.is('deleted_at', null);

    if (params.search) query = query.or(`id.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%`);
    if (params.customer_filter) query = query.or(`customer_name.ilike.%${params.customer_filter}%,customer_id.ilike.%${params.customer_filter}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    if (typeof params.min_amount === 'number' && !isNaN(params.min_amount)) query = query.gte('total', params.min_amount);
    if (typeof params.max_amount === 'number' && !isNaN(params.max_amount)) query = query.lte('total', params.max_amount);
    if (restrictVendorIds) query = query.in('vendor_id', restrictVendorIds);

    query = query.order('created_at', { ascending: false }).range(from, to);

    let { data, count, error } = await query;
    if (error) throw error;

    // Optional client-side product filter (search inside items JSON)
    if (params.product_filter && data) {
      const needle = params.product_filter.toLowerCase();
      data = (data as any[]).filter(o =>
        Array.isArray(o.items) && o.items.some((it: any) =>
          String(it.title || '').toLowerCase().includes(needle) ||
          String(it.id || '').toLowerCase().includes(needle)
        )
      );
    }

    return paginateResult(data || [], count || 0, page, perPage);
  },

  /** Fetch ALL orders matching the same filters (no pagination) — used for full export. */
  getOrdersForExport: async (params: {
    search?: string; status?: string; date_from?: string; date_to?: string;
    vendor_type?: 'product' | 'service' | 'all'; deleted?: boolean;
    vendor_filter?: string; product_filter?: string;
    min_amount?: number; max_amount?: number; customer_filter?: string;
  }) => {
    const all: Order[] = [];
    let page = 1;
    while (true) {
      const res = await api.getOrders({ ...params, page, per_page: 500 });
      all.push(...res.data);
      if (page * 500 >= res.total || res.data.length === 0) break;
      page++;
      if (page > 50) break; // hard safety cap (25k rows)
    }
    return all;
  },

  softDeleteOrders: async (ids: string[], reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('orders').update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id || null,
      deletion_reason: reason || null,
    } as any).in('id', ids);
    if (error) throw error;
  },

  restoreOrders: async (ids: string[]) => {
    const { error } = await supabase.from('orders').update({
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
    } as any).in('id', ids);
    if (error) throw error;
  },

  updateOrderStatus: async (id: string, status: Order['status'], shippingData?: { shipping_type?: string; courier_name?: string; tracking_number?: string; tracking_url?: string; shipping_notes?: string }) => {
    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    if (shippingData) {
      if (shippingData.shipping_type) updatePayload.shipping_type = shippingData.shipping_type;
      if (shippingData.courier_name) updatePayload.courier_name = shippingData.courier_name;
      if (shippingData.tracking_number) updatePayload.tracking_number = shippingData.tracking_number;
      if (shippingData.tracking_url) updatePayload.tracking_url = shippingData.tracking_url;
      if (shippingData.shipping_notes) updatePayload.shipping_notes = shippingData.shipping_notes;
    }
    // Use .select() so we can detect when an RLS policy silently blocks the update.
    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select('id, status, shipping_type, courier_name, tracking_number, tracking_url, shipping_notes');
    if (error) throw error;
    if (!updated || updated.length === 0) {
      throw new Error("Order could not be updated. You may not have permission to modify this order.");
    }

    if (status === 'completed') {
      const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
      if (order) {
        // Fetch vendor and their active plan for commission
        const { data: vendor } = await supabase.from('vendors').select('*').eq('id', order.vendor_id).single();
        let commRate = vendor?.commission_rate || 10;

        // Use plan-based commission if vendor has an active plan
        if (vendor?.plan_id) {
          const { data: plan } = await supabase.from('vendor_plans').select('commission_percentage, max_redemption_percentage').eq('id', vendor.plan_id).single();
          if (plan?.commission_percentage != null) {
            commRate = Number(plan.commission_percentage);
            // Also sync the vendor's commission_rate field for consistency
            await supabase.from('vendors').update({ commission_rate: commRate }).eq('id', vendor.id);
          }
        }

        const commission = Math.round(Number(order.total) * commRate / 100);

        await supabase.from('settlements').insert({
          id: genId('STL'), vendor_id: order.vendor_id, order_id: order.id,
          amount: order.total, commission, net_amount: Number(order.total) - commission,
          status: 'pending', vendor_name: order.vendor_name,
        });

        // Award loyalty points using order_reward_rate from platform variables
        let rewardRate = 2;
        const { data: rewardRateVar } = await supabase.from('platform_variables').select('value').eq('key', 'order_reward_rate').maybeSingle();
        if (rewardRateVar) rewardRate = Number(rewardRateVar.value) || 2;
        const rewardPoints = Math.round(Number(order.total) * rewardRate / 100);
        const { data: customer } = await supabase.from('customers').select('*').eq('id', order.customer_id).single();
        if (customer && rewardPoints > 0) {
          await supabase.from('customers').update({ wallet_points: customer.wallet_points + rewardPoints }).eq('id', customer.id);
          await supabase.from('points_transactions').insert({
            id: genId('PT'), user_id: customer.id, type: 'order_reward', points: rewardPoints,
            description: `${rewardRate}% reward on order ${order.id} (₹${Number(order.total).toLocaleString('en-IN')})`, user_name: customer.name,
          });
        }

        // Record points redemption if any were used
        if (order.points_used > 0 && customer) {
          await supabase.from('points_transactions').insert({
            id: genId('PT'), user_id: customer.id, type: 'redemption', points: -order.points_used,
            description: `Redeemed on order ${order.id}`, user_name: customer.name,
          });
        }

        // Update vendor stats
        if (vendor) {
          await supabase.from('vendors').update({
            total_orders: (vendor.total_orders || 0) + 1,
            total_revenue: (Number(vendor.total_revenue) || 0) + Number(order.total),
          }).eq('id', vendor.id);
        }
      }
    }
    return { success: true };
  },

  placeOrder: async (cartItems: CartItem[], customerId: string, pointsUsed: number, discount: number) => {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
    const now = new Date().toISOString();

    const byVendor: Record<string, CartItem[]> = {};
    cartItems.forEach(item => {
      if (!byVendor[item.vendor_id]) byVendor[item.vendor_id] = [];
      byVendor[item.vendor_id].push(item);
    });

    const orders: Order[] = [];
    const vendorIds = Object.keys(byVendor);
    const pointsPerOrder = Math.floor(pointsUsed / vendorIds.length);
    const discountPerOrder = Math.floor(discount / vendorIds.length);

    for (const vendorId of vendorIds) {
      const items = byVendor[vendorId];
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = items.reduce((s, i) => s + i.tax * i.qty, 0);
      const orderId = genId('ORD');

      const order: any = {
        id: orderId, customer_id: customer?.id || customerId, vendor_id: vendorId,
        subtotal, tax, discount: discountPerOrder, points_used: pointsPerOrder,
        total: subtotal + tax - discountPerOrder - pointsPerOrder,
        status: 'placed',
        customer_name: customer?.name || '', vendor_name: items[0].vendor,
        items: items.map(i => ({ title: i.title, qty: i.qty, emoji: i.emoji, price: i.price })),
      };
      await supabase.from('orders').insert(order);
      orders.push(order);
    }

    if (pointsUsed > 0 && customer) {
      await supabase.from('customers').update({ wallet_points: customer.wallet_points - pointsUsed }).eq('id', customer.id);
    }

    // Optional Odoo ERP sync (no-op if disabled)
    try {
      const { maybePushOrderToOdoo } = await import('@/lib/odoo-sync');
      orders.forEach(o => { void maybePushOrderToOdoo(o.id); });
    } catch {}

    return { success: true, orders };
  },

  // Settlements
  getSettlements: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('settlements').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  settleSettlement: async (id: string) => {
    const { error } = await supabase.from('settlements').update({ status: 'settled', settled_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Bulk operations
  bulkDeleteCustomers: async (ids: string[]) => {
    const ts = Date.now().toString();
    for (const id of ids) {
      const { data: cust } = await supabase.from('customers').select('email, mobile, referral_code').eq('id', id).single();
      await supabase.from('customers').update({
        status: 'deleted', deleted_at: new Date().toISOString(),
        email: cust?.email ? `${cust.email}_DEL_${ts}` : `deleted_${ts}`,
        mobile: cust?.mobile ? `${cust.mobile}_DEL_${ts}` : `deleted_${ts}`,
        referral_code: cust?.referral_code ? `${cust.referral_code}_DEL_${ts}` : `deleted_${ts}`,
      }).eq('id', id);
    }
    return { success: true };
  },

  bulkUpdateCustomerStatus: async (ids: string[], status: string) => {
    const { error } = await supabase.from('customers').update({ status }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkDeleteProducts: async (ids: string[]) => {
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkUpdateProductStatus: async (ids: string[], status: string) => {
    const { error } = await supabase.from('products').update({ status }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkUpdateProductDealOfDay: async (ids: string[], isDeal: boolean) => {
    const { error } = await supabase.from('products').update({ is_deal_of_day: isDeal }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkDeleteVendors: async (ids: string[]) => {
    const ts = Date.now().toString();
    for (const id of ids) {
      const { data: vend } = await supabase.from('vendors').select('email, mobile').eq('id', id).single();
      if (vend) {
        await supabase.from('vendors').update({
          status: 'deleted', deleted_at: new Date().toISOString(),
          email: vend.email ? `${vend.email}_DEL_${ts}` : `deleted_${ts}`,
          mobile: vend.mobile ? `${vend.mobile}_DEL_${ts}` : `deleted_${ts}`,
        }).eq('id', id);
      } else {
        await supabase.from('service_vendors').update({
          status: 'deleted', deleted_at: new Date().toISOString(),
        }).eq('id', id);
      }
    }
    return { success: true };
  },

  bulkUpdateVendorStatus: async (ids: string[], status: string) => {
    await supabase.from('vendors').update({ status }).in('id', ids);
    await supabase.from('service_vendors').update({ status }).in('id', ids);
    return { success: true };
  },

  bulkDeleteServices: async (ids: string[]) => {
    const { error } = await supabase.from('services').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkUpdateServiceStatus: async (ids: string[], status: string) => {
    const { error } = await supabase.from('services').update({ status }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkDeleteCategories: async (ids: string[]) => {
    const { error } = await supabase.from('categories').delete().in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkUpdateOrderStatus: async (ids: string[], status: string) => {
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkUpdateClassifiedStatus: async (ids: string[], status: string) => {
    const { error } = await supabase.from('classified_ads').update({ status }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  bulkSettleSettlements: async (ids: string[]) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('settlements').update({ status: 'settled', settled_at: now }).in('id', ids);
    if (error) throw error;
    return { success: true };
  },

  // Classified Ads
  getClassifiedAds: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('classified_ads').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  updateClassifiedStatus: async (id: string, status: ClassifiedAd['status']) => {
    const { error } = await supabase.from('classified_ads').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  postClassifiedAd: async (data: { title: string; description: string; price: number; category: string; city: string; area: string; images?: string[] }) => {
    // Get current user info
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) throw new Error("Not authenticated");
    
    // Get customer info
    const { data: customerData } = await supabase.rpc('get_customer_id', { _user_id: userId });
    const customerId = customerData || userId;
    const { data: customer } = await supabase.from('customers').select('name').eq('id', customerId).single();

    const newAd = {
      id: genId('AD'),
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      city: data.city,
      area: data.area,
      images: (data.images || []) as unknown as any,
      user_id: customerId,
      status: "pending",
      user_name: customer?.name || "User",
    };
    const { error } = await supabase.from('classified_ads').insert(newAd as any);
    if (error) throw error;
    return { success: true, ad: newAd };
  },

  getCustomerClassifieds: async (userId: string) => {
    const { data } = await supabase.from('classified_ads').select('*').eq('user_id', userId);
    return (data || []) as ClassifiedAd[];
  },

  getBrowseClassifieds: async (params: { category?: string; search?: string }) => {
    let query = supabase.from('classified_ads').select('*').eq('status', 'approved');
    if (params.category) query = query.ilike('category', `%${params.category}%`);
    if (params.search) query = query.ilike('title', `%${params.search}%`);
    const { data } = await query;
    return (data || []) as ClassifiedAd[];
  },

  getClassifiedCategories: () => {
    // Synchronous for backward compat - will be loaded elsewhere
    return [] as { id: number; name: string }[];
  },

  getClassifiedCategoriesAsync: async () => {
    const { data } = await supabase.from('classified_categories').select('*');
    return (data || []) as { id: number; name: string }[];
  },

  // Points
  getPointsTransactions: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('points_transactions').select('*', { count: 'exact' });
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Referrals
  getReferrals: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('referrals').select('*', { count: 'exact' });
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Categories
  // includeInactive=false by default — customer-facing surfaces should only
  // see active categories. Admin pages pass includeInactive=true.
  // categoryType: 'product' | 'service' filters the unified categories table
  // by its category_type column. Rows with NULL category_type are treated as
  // 'product' for backward compatibility with legacy data.
  getCategories: async (
    includeInactive: boolean | { includeInactive?: boolean; categoryType?: 'product' | 'service' } = false,
  ) => {
    const opts = typeof includeInactive === 'boolean'
      ? { includeInactive, categoryType: undefined as 'product' | 'service' | undefined }
      : { includeInactive: !!includeInactive.includeInactive, categoryType: includeInactive.categoryType };
    let q = supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (!opts.includeInactive) q = q.eq('status', 'active');
    const { data } = await q;
    let rows = (data || []) as Category[];
    if (opts.categoryType === 'product') {
      rows = rows.filter((c: any) => !c.category_type || c.category_type === 'product');
    } else if (opts.categoryType === 'service') {
      rows = rows.filter((c: any) => c.category_type === 'service');
    }
    return rows;
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    const validFields = ['name', 'parent_id', 'image', 'status', 'count', 'banner_image', 'icon',
      'is_trending', 'description', 'is_emergency', 'commission_rate', 'verification_status',
      'promotion_banner_url', 'promotion_title', 'promotion_active',
      'display_order', 'show_on_homepage', 'category_type',
      'theme_color', 'theme_accent'];
    const filtered: Record<string, any> = {};
    for (const key of validFields) {
      if (key in data) filtered[key] = (data as any)[key];
    }
    const { error } = await supabase.from('categories').update(filtered).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  createCategory: async (data: Partial<Category>) => {
    const newCat = { id: genId('CAT'), ...data, count: 0 };
    const { error } = await supabase.from('categories').insert(newCat as any);
    if (error) throw error;
    return { success: true, category: newCat };
  },

  deleteCategory: async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Services CRUD


  updateService: async (id: string, data: Partial<Service>) => {
    const validFields = ['vendor_id', 'category_id', 'subcategory_id', 'subcategory_name', 'title', 'description', 'price', 'tax', 'discount',
      'max_points_redeemable', 'status', 'vendor_name', 'category_name', 'emoji', 'image', 'service_area',
      'duration', 'images', 'short_description', 'long_description', 'meta_title', 'meta_description',
      'slug', 'pricing_slots', 'booking_duration_minutes', 'max_bookings_per_slot',
      'service_duration_minutes',
      'sac_code', 'gst_rate', 'commission_override', 'max_redemption_percentage',
      'rejection_reason', 'approved_at', 'approved_by', 'updated_at'];
    const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of validFields) {
      if (key in data) {
        let val = (data as any)[key];
        if ((key === 'category_id' || key === 'subcategory_id') && val === '') val = null;
        filtered[key] = val;
      }
    }
    if (filtered.category_id) await ensureServiceCategoryMirrored(filtered.category_id, null);
    if (filtered.subcategory_id) await ensureServiceCategoryMirrored(filtered.subcategory_id, filtered.category_id || null);
    const { data: updated, error } = await supabase.from('services').update(filtered).eq('id', id).select();
    if (error) { console.error("Service update error:", error); throw error; }
    if (!updated || updated.length === 0) throw new Error("Service update failed — no rows affected.");
    return { success: true };
  },

  createService: async (data: Partial<Service>) => {
    // Validate required fields
    const errors: string[] = [];
    if (!data.title?.trim()) errors.push("Service title is required");
    if (!data.vendor_id?.trim()) errors.push("Vendor is required");
    if (errors.length > 0) throw new Error(errors.join(". "));
    // Ensure vendor exists in service_vendors (services FK references service_vendors, not vendors)
    if (data.vendor_id) {
      const { data: existing } = await supabase.from('service_vendors').select('id').eq('id', data.vendor_id).maybeSingle();
      if (!existing) {
        // Copy from product vendors table
        const { data: pv } = await supabase.from('vendors').select('id, name, business_name, mobile, email, category_id, city_id, area_id, commission_rate, status').eq('id', data.vendor_id).maybeSingle();
        if (pv) {
          // Validate FK references exist before inserting
          let validCityId: string | null = null;
          let validAreaId: string | null = null;
          if (pv.city_id) {
            const { data: cityCheck } = await supabase.from('cities').select('id').eq('id', pv.city_id).maybeSingle();
            if (cityCheck) validCityId = pv.city_id;
          }
          if (pv.area_id) {
            const { data: areaCheck } = await supabase.from('areas').select('id').eq('id', pv.area_id).maybeSingle();
            if (areaCheck) validAreaId = pv.area_id;
          }
          const { error: svErr } = await supabase.from('service_vendors').insert({
            id: pv.id, name: pv.name, business_name: pv.business_name,
            mobile: pv.mobile, email: pv.email, category_id: pv.category_id || null,
            city_id: validCityId, area_id: validAreaId,
            commission_rate: pv.commission_rate, membership: 'basic',
            vendor_category: 'service',
            // service_vendors.status allows ONLY: pending | level1_approved | level2_approved | verified | rejected
            status: (['pending','level1_approved','level2_approved','verified','rejected'] as const).includes(String(pv.status) as any) ? String(pv.status) : 'verified',
          } as any);
          if (svErr) {
            console.error("ensureServiceVendor:", svErr.message);
            throw new Error("Could not sync vendor to service vendors: " + svErr.message);
          }
        } else {
          throw new Error("Vendor not found. Please select a valid vendor.");
        }
      }
    }
    const validFields = ['title', 'description', 'short_description', 'long_description', 'price', 'tax', 'discount',
      'max_points_redeemable', 'status', 'vendor_id', 'vendor_name', 'category_id', 'category_name',
      'subcategory_id', 'subcategory_name',
      'emoji', 'image', 'images', 'service_area', 'duration', 'meta_title', 'meta_description', 'slug',
      'pricing_slots', 'booking_duration_minutes', 'max_bookings_per_slot',
      'service_duration_minutes',
      'sac_code', 'gst_rate', 'commission_override', 'max_redemption_percentage'];
    const newSrv: Record<string, any> = { id: genId('SRV'), rating: 0, reviews: 0 };
    for (const key of validFields) {
      if (key in data && (data as any)[key] !== undefined) newSrv[key] = (data as any)[key];
    }
    // Convert empty FK strings to null (FK to service_categories)
    if (newSrv.category_id === '') newSrv.category_id = null;
    if (newSrv.subcategory_id === '') newSrv.subcategory_id = null;
    // services.category_id FK -> service_categories(id). The admin modal now also surfaces
    // rows from the unified `categories` table (category_type='service'). Mirror those into
    // `service_categories` so the FK insert succeeds.
    await ensureServiceCategoryMirrored(newSrv.category_id, null);
    await ensureServiceCategoryMirrored(newSrv.subcategory_id, newSrv.category_id);
    // Admin-created services are auto-approved (active) unless an explicit non-default status was chosen.
    // Vendor-created services go through VendorServicesPage which forces 'pending_approval'.
    if (!newSrv.status || newSrv.status === 'draft') {
      newSrv.status = 'active';
    }
    const { error } = await supabase.from('services').insert(newSrv as any);
    if (error) { console.error("Service create error:", error); throw error; }
    return { success: true, service: newSrv };
  },

  // Approve a vendor-submitted service (sets status=active and stamps approval audit)
  approveService: async (id: string) => {
    const { error } = await supabase.from('services').update({
      status: 'active',
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    } as any).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Reject a vendor-submitted service with a mandatory reason
  rejectService: async (id: string, reason: string) => {
    if (!reason?.trim()) throw new Error("Rejection reason is required");
    const { error } = await supabase.from('services').update({
      status: 'rejected',
      rejection_reason: reason.trim(),
    } as any).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  deleteService: async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // CMS
  getBanners: async () => {
    const { data } = await supabase.from('banners').select('*').order('priority', { ascending: false });
    return (data || []) as Banner[];
  },

  updateBanner: async (id: string, data: Partial<Banner>) => {
    const validFields = ['title', 'subtitle', 'desktop_image', 'mobile_image', 'link', 'priority',
      'start_date', 'end_date', 'status', 'gradient'];
    const filtered: Record<string, any> = {};
    for (const key of validFields) {
      if (key in data) filtered[key] = (data as any)[key];
    }
    const { error } = await supabase.from('banners').update(filtered).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Platform Variables
  getPlatformVariables: async () => {
    const { data } = await supabase.from('platform_variables').select('*');
    return (data || []) as PlatformVariable[];
  },

  updatePlatformVariable: async (id: string, value: string, oldValue?: string, key?: string) => {
    const { data, error } = await supabase.from('platform_variables').update({ value }).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Update failed — no rows affected. Check permissions.');
    // Invalidate the award-points platform variable cache
    try { (window as any).__platformVarCacheTime = 0; } catch {}
    // Log the change to audit_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        table_name: 'platform_variables',
        operation: 'update',
        record_id: id,
        old_data: { key: key || id, value: oldValue || '' },
        new_data: { key: key || id, value },
        performed_by: user?.id || null,
        performed_by_role: 'admin',
      } as any);
    } catch { /* don't break save for audit */ }
    return { success: true };
  },

  // Occupations
  getOccupations: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('occupations').select('*', { count: 'exact' });
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  updateOccupation: async (id: string, data: Partial<Occupation>) => {
    const { error } = await supabase.from('occupations').update(data as any).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  createOccupation: async (data: Partial<Occupation>) => {
    const newOcc = { id: genId('OCC'), name: data.name || '', status: data.status || 'active', customer_count: 0 };
    const { error } = await supabase.from('occupations').insert(newOcc);
    if (error) throw error;
    return { success: true, occupation: newOcc };
  },

  deleteOccupation: async (id: string) => {
    const { error } = await supabase.from('occupations').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getActiveOccupations: async () => {
    const { data } = await supabase.from('occupations').select('id, name').eq('status', 'active').order('name');
    return (data || []) as { id: string; name: string }[];
  },

  getStates: async (countryCode?: string) => {
    let q = supabase.from('states').select('*').eq('status', 'active');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data } = await q.order('name');
    return (data || []) as { id: string; name: string; code: string; country_code: string }[];
  },

  getDistricts: async (stateId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('state_id', stateId).eq('status', 'active').order('name');
    return (data || []) as { id: string; name: string; state_id: string }[];
  },

  /** Get cities for a country, optionally filtered by state name. Used by registration & vendor filter dropdowns. */
  getCitiesByCountry: async (countryCode: string, stateName?: string) => {
    let q = supabase.from('cities').select('id, name, state, country_code').eq('status', 'active').eq('country_code', countryCode);
    if (stateName) q = q.eq('state', stateName);
    const { data } = await q.order('name');
    return (data || []) as { id: string; name: string; state: string; country_code: string }[];
  },

  // Cities
  getCities: async (params: { page?: number; per_page?: number; search?: string; status?: string; country_code?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('cities').select('*', { count: 'exact' });
    if (params.search) query = query.or(`name.ilike.%${params.search}%,state.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.country_code) query = query.eq('country_code', params.country_code);
    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Areas
  getAreas: async (params: { page?: number; per_page?: number; search?: string; status?: string; city_id?: string; country_code?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('areas').select('*', { count: 'exact' });
    if (params.search) query = query.or(`name.ilike.%${params.search}%,city_name.ilike.%${params.search}%,pincode.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.city_id) query = query.eq('city_id', params.city_id);
    if (params.country_code) query = query.eq('country_code', params.country_code);
    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Tax Config
  getTaxConfig: async (params: { page?: number; per_page?: number; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('tax_config').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Popup Banners
  getPopupBanners: async (params: { page?: number; per_page?: number; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('popup_banners').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Advertisements
  getAdvertisements: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('advertisements').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Website Queries
  getWebsiteQueries: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('website_queries').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  updateWebsiteQueryStatus: async (id: string, status: WebsiteQuery['status']) => {
    const { error } = await supabase.from('website_queries').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  replyToWebsiteQuery: async (id: string, reply: string, repliedBy: string) => {
    // Fetch the original query to get visitor email + subject
    const { data: query, error: fetchErr } = await (supabase as any)
      .from('website_queries')
      .select('email, name, subject, message')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const { error } = await (supabase as any).from('website_queries').update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      replied_by: repliedBy,
      status: 'resolved',
    }).eq('id', id);
    if (error) throw error;

    // Send the reply via SMTP edge function (best effort — don't block save)
    if (query?.email) {
      try {
        await sendEmail({
          to: query.email,
          subject: `Re: ${query.subject || 'Your enquiry'}`,
          html: `
            <p>Hi ${escapeForEmail(query.name || 'there')},</p>
            <p>Thank you for reaching out to PlaNext4U. Here is our reply to your enquiry:</p>
            <blockquote style="margin:12px 0;padding:12px 16px;background:#f3f4f6;border-left:3px solid #0d9488;white-space:pre-wrap;">${escapeForEmail(reply)}</blockquote>
            <p style="margin-top:20px;color:#6b7280;font-size:12px;">
              <strong>Your original message:</strong><br/>
              <em>${escapeForEmail(query.message || '').slice(0, 500)}</em>
            </p>
            <p>Regards,<br/>The PlaNext4U Team</p>
          `,
          replyTo: 'support@planext4u.com',
        });
      } catch (e) {
        console.error('Email send failed (reply still saved):', e);
        throw new Error('Reply saved, but email failed to send. Check edge function logs.');
      }
    }
    return { success: true };
  },

  // Report Log
  getReportLog: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('report_log').select('*', { count: 'exact' });
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // ===== Customer-facing APIs =====
  getCustomerHome: async () => {
    const [
      { data: banners },
      { data: categories },
      { data: serviceCategories },
      { data: featuredProducts },
      { data: featuredServices },
      { data: storeBanners },
      { data: platformVars },
    ] = await Promise.all([
      supabase.from('banners').select('id,title,subtitle,desktop_image,mobile_image,link,priority,status,start_date,end_date,gradient').eq('status', 'active').order('priority', { ascending: false }),
      supabase.from('categories').select('id,name,image,icon,display_order,parent_id,category_type,status,show_on_homepage,count,banner_image,theme_color,theme_accent,is_trending,is_emergency').eq('status', 'active'),
      supabase.from('service_categories').select('id,name,image,icon,display_order,parent_id,status,show_on_homepage,count,banner_image,is_trending,is_emergency,promotion_active,promotion_banner_url,promotion_title').eq('status', 'active').is('parent_id', null).order('display_order', { ascending: true }),
      supabase.from('products').select('id,title,image,images,price,discount,rating,reviews,stock,slug,vendor_id,vendor_name,category_id,category_name,subcategory_id,subcategory_name,status,is_deal_of_day,emoji,created_at').eq('status', 'active').limit(100),
      supabase.from('services').select('id,title,description,image,price,discount,rating,reviews,duration,vendor_id,vendor_name,category_id,category_name,service_area,status,slug,emoji').eq('status', 'active').limit(4),
      supabase.from('popup_banners').select('id,title,description,image,link,status,start_date,end_date,created_at').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('platform_variables').select('key, value').or('key.ilike.homepage_image_%,key.eq.homepage_categories_max,key.eq.homepage_subcategories_per_parent'),
    ]);

    // Build assets map from platform variables (image keys) and config keys
    const assets: Record<string, string> = {};
    const platformConfig: Record<string, string> = {};
    (platformVars || []).forEach((v: any) => {
      if (v.key?.startsWith('homepage_image_')) assets[v.key] = v.value;
      else platformConfig[v.key] = v.value;
    });

    // Filter products by verified/active vendors only
    let verifiedProducts = featuredProducts || [];
    if (verifiedProducts.length) {
      const vIds = [...new Set(verifiedProducts.map((p: any) => p.vendor_id))];
      const { data: vendors } = await supabase.from('vendors').select('id, status').in('id', vIds).in('status', ['active', 'verified']);
      if (vendors?.length) {
        const validIds = new Set(vendors.map(v => v.id));
        verifiedProducts = verifiedProducts.filter((p: any) => validIds.has(p.vendor_id));
      } else {
        verifiedProducts = [];
      }
    }

    // Deals = explicitly flagged products; Trending = highest rated
    const dealProducts = verifiedProducts.filter((p: any) => p.is_deal_of_day === true).slice(0, 8);
    const trendingProducts = [...verifiedProducts]
      .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.reviews) || 0) - (Number(a.reviews) || 0))
      .slice(0, 8);

    // Shop surfaces only show product-type categories. Service categories live
    // in `service_categories` (and any rows with category_type='service' in the
    // unified `categories` table are excluded here).
    const productCategories = (categories || []).filter(
      (c: any) => !c.category_type || c.category_type === 'product',
    );

    return {
      banners: banners || [],
      categories: productCategories,
      serviceCategories: serviceCategories || [],
      featuredProducts: verifiedProducts.slice(0, 8),
      dealProducts,
      trendingProducts,
      featuredServices: featuredServices || [],
      storeBanners: storeBanners || [],
      assets,
      platformConfig,
    };
  },

  browseProducts: async (params: { category?: string; search?: string; sort?: string; userLat?: number; userLng?: number; userCityId?: string | null }) => {
    // Narrow column list: card render + post-processing (vendor filter, priority ranking, sort).
    // Product detail page re-fetches the full row via getProductById.
    const PRODUCT_LIST_COLS = 'id,title,image,images,price,discount,rating,reviews,stock,slug,vendor_id,vendor_name,category_id,category_name,subcategory_id,subcategory_name,status,is_deal_of_day,emoji,product_attributes,created_at';
    let query = supabase.from('products').select(PRODUCT_LIST_COLS).eq('status', 'active');
    if (params.category) {
      // Resolve whether the supplied name is a parent category or a subcategory.
      // - Parent  → match products whose category_name matches (covers all its subcategories).
      // - Subcat  → match products whose subcategory_name matches exactly so we don't bleed
      //             in sibling subcategories under the same parent.
      const { data: catRow } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .ilike('name', params.category)
        .maybeSingle();
      if (catRow?.parent_id) {
        // Subcategory: filter strictly by subcategory_name (or subcategory_id as fallback).
        query = query.or(
          `subcategory_name.ilike.${params.category},subcategory_id.eq.${catRow.id}`
        );
      } else {
        // Parent (or unknown): match by category_name so the full tree is shown.
        query = query.ilike('category_name', `%${params.category}%`);
      }
    }
    if (params.search) {
      // Flexible search: split into tokens, ignore hyphens/punctuation, match any token
      // in title/category/vendor. Final precise filtering is done post-fetch below.
      const raw = params.search.trim();
      const tokens = raw
        .replace(/[-_/\\]+/g, ' ')
        .split(/\s+/)
        .map(t => t.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(t => t.length >= 2);
      const searchTerms = tokens.length ? tokens : [raw.replace(/[^\p{L}\p{N}]/gu, '')].filter(Boolean);
      if (searchTerms.length) {
        const orParts: string[] = [];
        for (const t of searchTerms) {
          const safe = t.replace(/[,()]/g, '');
          orParts.push(`title.ilike.%${safe}%`);
          orParts.push(`category_name.ilike.%${safe}%`);
          orParts.push(`vendor_name.ilike.%${safe}%`);
        }
        query = query.or(orParts.join(','));
      }
    }
    if (params.sort === 'price_low') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_high') query = query.order('price', { ascending: false });
    else if (params.sort === 'rating') query = query.order('rating', { ascending: false });
    else if (params.sort === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('created_at', { ascending: false }); // default: newest first

    const { data: products } = await query;
    if (!products?.length) return [] as Product[];

    // Apply vendor plan visibility filtering
    const vendorIds = [...new Set(products.map(p => p.vendor_id))];
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, plan_id, plan_end_date, shop_latitude, shop_longitude, city_id, status')
      .in('id', vendorIds)
      .in('status', ['active', 'verified']);

    if (!vendors?.length) return [] as Product[];

    // Only show products from verified/active vendors
    const verifiedVendorIds = new Set(vendors.map(v => v.id));
    const filteredProducts = products.filter(p => verifiedVendorIds.has(p.vendor_id));

    const planIds = [...new Set(vendors.filter(v => v.plan_id).map(v => v.plan_id!))];
    let plansMap: Record<string, any> = {};
    if (planIds.length) {
      const { data: plans } = await supabase.from('vendor_plans').select('*').in('id', planIds);
      plans?.forEach(p => { plansMap[p.id] = p; });
    }

    const vendorMap: Record<string, any> = {};
    vendors.forEach(v => { vendorMap[v.id] = v; });

    const userLat = params.userLat || 0;
    const userLng = params.userLng || 0;

    // Haversine distance in km
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const filtered = filteredProducts.filter(p => {
      const vendor = vendorMap[p.vendor_id];
      return isVendorVisibleToCustomer(vendor, plansMap, userLat, userLng, (params as any).userCityId);
    });

    // Priority category ordering — products from Groceries, Bio Enzyme, Combo Offers
    // (and their subcategories) always come first, preserving the user's chosen sort
    // order within each group. Resolved dynamically by name; no hardcoded IDs.
    const PRIORITY_NAMES = ['Groceries', 'Bio Enzyme', 'Combo Offers'];
    const priorityRankById = new Map<string, number>();
    const priorityNameRank = new Map<string, number>(
      PRIORITY_NAMES.map((n, i) => [n.toLowerCase(), i])
    );
    try {
      const { data: catRows } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .or(PRIORITY_NAMES.map(n => `name.ilike.${n}`).join(','));
      const parents: string[] = [];
      (catRows || []).forEach((c: any) => {
        const rank = priorityNameRank.get(String(c.name || '').toLowerCase());
        if (rank !== undefined) {
          priorityRankById.set(c.id, rank);
          parents.push(c.id);
        }
      });
      if (parents.length) {
        const { data: subRows } = await supabase
          .from('categories')
          .select('id, parent_id')
          .in('parent_id', parents);
        (subRows || []).forEach((s: any) => {
          const r = priorityRankById.get(s.parent_id);
          if (r !== undefined) priorityRankById.set(s.id, r);
        });
      }
    } catch {}

    const rankFor = (p: any): number => {
      const byId = (p.category_id && priorityRankById.get(p.category_id))
        ?? (p.subcategory_id && priorityRankById.get(p.subcategory_id));
      if (typeof byId === 'number') return byId;
      const byName = priorityNameRank.get(String(p.category_name || '').toLowerCase());
      if (typeof byName === 'number') return byName;
      const bySubName = priorityNameRank.get(String(p.subcategory_name || '').toLowerCase());
      if (typeof bySubName === 'number') return bySubName;
      return PRIORITY_NAMES.length;
    };

    const indexed = filtered.map((p, i) => ({ p, i, rank: rankFor(p) }));
    indexed.sort((a, b) => a.rank - b.rank || a.i - b.i);
    return indexed.map(x => x.p) as Product[];
  },

  getCustomerOrders: async (customerId: string) => {
    // Prefer the SECURITY DEFINER RPC — it also picks up orders placed under
    // duplicate customer records that share the same mobile/email, so the
    // customer sees ALL of their historical orders even after account
    // dedupe/renumber events.
    const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('get_my_customer_orders');
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData as unknown as Order[];
    }
    // Fallback: legacy direct query on the current customer_id.
    const { data } = await supabase.from('orders').select(ORDER_LIST_COLS_FULL).eq('customer_id', customerId).order('created_at', { ascending: false });
    return (data || []) as unknown as Order[];
  },

  getCustomerProfile: async (customerId: string) => {
    const { data: user } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (!user) return null;
    const [{ count: orderCount }, { count: referralCount }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
      supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
    ]);
    return { ...user, total_orders: orderCount || 0, total_referrals: referralCount || 0 };
  },

  // Cart (kept in localStorage for simplicity)
  getCart: async (): Promise<CartItem[]> => {
    const { loadCart } = await import('./persist');
    return loadCart();
  },

  addToCart: async (product: Product, qty: number = 1, selectedAttributes?: Record<string, string>, variantId?: string) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart();

    // Cart restriction: check parent_item_id vendor conflict
    if (product.parent_item_id) {
      const conflicting = cart.find((i: CartItem) =>
        i.parent_item_id === product.parent_item_id &&
        i.vendor_id !== product.vendor_id &&
        i.id !== product.id
      );
      if (conflicting) {
        return {
          success: false,
          blocked: true,
          message: "This product is already added from another vendor. Please remove it before adding this.",
          cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
        };
      }
    }

    // For variant products, use a composite key (productId + variantId) to allow different variants in cart
    const cartKey = variantId ? `${product.id}__${variantId}` : product.id;
    const existing = cart.find((i: CartItem) => i.id === cartKey);
    const desiredQty = (existing?.qty || 0) + qty;

    // Live stock cross-check before adding/incrementing.
    //
    // IMPORTANT: Many vendors run inventory-untracked catalogs (manage_stock = false,
    // stock_status = 'in_stock') where the `stock` integer is meaningless / always 0.
    // Treating those as "out of stock" silently breaks the entire add-to-cart flow
    // (this happened: 993/995 active products were untracked but stock=0, blocking
    // every customer). Variants always track stock so they remain strictly checked.
    let availableStock: number | null = null;
    let manageStock = true;
    let stockStatus: string | null = null;
    try {
      if (variantId) {
        const { data: v } = await supabase
          .from('product_variants')
          .select('stock_quantity, stock_status')
          .eq('id', variantId)
          .maybeSingle();
        availableStock = (v as any)?.stock_quantity ?? 0;
        stockStatus = (v as any)?.stock_status ?? null;
        // Variants always honour stock_quantity — keep manageStock = true.
      } else {
        const { data: p } = await supabase
          .from('products')
          .select('stock, manage_stock, stock_status')
          .eq('id', product.id)
          .maybeSingle();
        availableStock = (p as any)?.stock ?? null;
        manageStock = (p as any)?.manage_stock ?? true;
        stockStatus = (p as any)?.stock_status ?? null;
      }
    } catch {
      availableStock = null;
    }

    // Explicit out_of_stock flag always blocks, regardless of manage_stock.
    if (stockStatus === 'out_of_stock') {
      return {
        success: false,
        blocked: true,
        message: `${product.title} is out of stock.`,
        cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
      };
    }
    // Whenever a numeric stock value is present, enforce it. Untracked products
    // with a NULL stock value remain unrestricted.
    if (availableStock !== null) {
      if (availableStock <= 0) {
        return {
          success: false,
          blocked: true,
          message: `${product.title} is out of stock.`,
          cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
        };
      }
      if (desiredQty > availableStock) {
        return {
          success: false,
          blocked: true,
          message: `Only ${availableStock} unit(s) of ${product.title} available.`,
          cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
        };
      }
    }

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: cartKey, title: product.title, price: product.price, qty,
        vendor: product.vendor_name || '', vendor_id: product.vendor_id,
        emoji: product.emoji || '📦', image: product.image || '',
        maxPoints: product.max_points_redeemable,
        tax: product.tax, discount: product.discount,
        parent_item_id: product.parent_item_id || null,
        selected_attributes: selectedAttributes || undefined,
        variant_id: variantId || undefined,
      });
    }
    saveCart(cart);
    return { success: true, blocked: false, cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0) };
  },

  updateCartItem: async (itemId: string, qty: number) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart();
    const idx = cart.findIndex((i: CartItem) => i.id === itemId);
    if (idx >= 0) {
      if (qty <= 0) cart.splice(idx, 1);
      else cart[idx].qty = qty;
    }
    saveCart(cart);
    return { success: true };
  },

  removeFromCart: async (itemId: string) => {
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart().filter((i: CartItem) => i.id !== itemId);
    saveCart(cart);
    return { success: true };
  },

  clearCart: async () => {
    const { saveCart } = await import('./persist');
    saveCart([]);
    return { success: true };
  },

  // ===== Vendor-facing APIs =====
  getVendorDashboard: async (vendorId: string) => {
    const [
      vendorRes,
      ordersRes,
      productsRes,
      servicesRes,
      settlementsRes,
    ] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle(),
      supabase.from('orders').select('*').eq('vendor_id', vendorId),
      supabase.from('products').select('*').eq('vendor_id', vendorId),
      supabase.from('services').select('*').eq('vendor_id', vendorId),
      supabase.from('settlements').select('*').eq('vendor_id', vendorId),
    ]);
    const vendor = vendorRes.data;
    const orders = ordersRes.data;
    const products = productsRes.data;
    const services = servicesRes.data;
    const settlements = settlementsRes.data;
    const allOrders = orders || [];
    return {
      vendor: vendor || {},
      orders: allOrders,
      products: products || [],
      services: services || [],
      settlements: settlements || [],
      todayRevenue: allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
      activeOrders: allOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
    };
  },

  getVendorProducts: async (vendorId: string) => {
    const { data } = await supabase.from('products').select('*').eq('vendor_id', vendorId);
    return (data || []) as Product[];
  },

  getVendorOrders: async (vendorId: string) => {
    const { data } = await supabase.from('orders').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false });
    return (data || []) as unknown as Order[];
  },

  getVendorSettlements: async (vendorId: string) => {
    const { data } = await supabase.from('settlements').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false });
    return (data || []) as Settlement[];
  },

  getVendorProfile: async (vendorId: string) => {
    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle();
    if (vendor) return vendor as any;
    const { data: svcVendor } = await supabase.from('service_vendors').select('*').eq('id', vendorId).maybeSingle();
    return svcVendor as any;
  },

  // Reports
  getSalesReport: async (_params: any) => {
    // Sales report only aggregates status/total/tax — 3 cols vs 55 = ~94% payload cut.
    const { data: orders } = await supabase.from('orders').select('status,total,tax').returns<Pick<Order, 'status' | 'total' | 'tax'>[]>();
    const allOrders = orders || [];
    const nonCancelled = allOrders.filter(o => o.status !== 'cancelled');
    return {
      summary: {
        total_sales: nonCancelled.reduce((s, o) => s + Number(o.total), 0),
        total_orders: allOrders.length,
        avg_order_value: Math.round(nonCancelled.reduce((s, o) => s + Number(o.total), 0) / Math.max(nonCancelled.length, 1)),
        total_tax: allOrders.reduce((s, o) => s + Number(o.tax), 0),
      },
      chart: [
        { month: 'Oct', sales: 380000, orders: 1650 }, { month: 'Nov', sales: 420000, orders: 1820 },
        { month: 'Dec', sales: 510000, orders: 2210 }, { month: 'Jan', sales: 390000, orders: 1690 },
        { month: 'Feb', sales: 450000, orders: 1950 }, { month: 'Mar', sales: 740000, orders: 3130 },
      ],
    };
  },

  getVendorPerformance: async (_params: any) => {
    const [{ data: v1 }, { data: v2 }] = await Promise.all([
      supabase.from('vendors').select('*').not('total_revenue', 'is', null),
      supabase.from('service_vendors').select('*').not('total_revenue', 'is', null),
    ]);
    return { vendors: [...(v1 || []), ...(v2 || [])] };
  },

  getSettlementReport: async (_params: any) => {
    const { data: settlements } = await supabase.from('settlements').select('*');
    const all = settlements || [];
    return {
      settlements: all,
      summary: {
        total_settled: all.filter(s => s.status === 'settled').reduce((sum, s) => sum + Number(s.net_amount), 0),
        total_pending: all.filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.net_amount), 0),
        total_commission: all.reduce((sum, s) => sum + Number(s.commission), 0),
      },
    };
  },

  getCustomerReport: async (_params: any) => {
    const { data: customers } = await supabase.from('customers').select('*');
    const all = customers || [];
    return { customers: all, summary: { total: all.length, active: all.filter(c => c.status === 'active').length } };
  },

  getPointsReport: async (_params: any) => {
    const { data } = await supabase.from('points_transactions').select('*');
    return { transactions: data || [] };
  },

  getReferralReport: async (_params: any) => {
    const { data } = await supabase.from('referrals').select('*');
    return { referrals: data || [] };
  },

  // Support Tickets
  getSupportTickets: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('support_tickets').select('*', { count: 'exact' });
    if (params.search) query = query.or(`subject.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,category.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  resolveTicket: async (id: string, status: string, resolution: string) => {
    const { error } = await supabase.from('support_tickets').update({
      status, resolution_notes: resolution, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  createSupportTicket: async (data: { subject: string; description: string; category: string; priority: string; customer_id: string }) => {
    const { data: customer } = await supabase.from('customers').select('name, mobile').eq('id', data.customer_id).single();
    const now = new Date().toISOString();
    const newTicket = {
      id: genId('TKT'),
      ...data, status: "open", customer_name: customer?.name || '',
      assigned_to: "Unassigned", resolution_notes: "",
    };
    const { error } = await supabase.from('support_tickets').insert(newTicket as any);
    if (error) throw error;
    return { success: true, ticket: newTicket };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PERMANENT DELETION (admin only) — impact preview + cascade-aware removal
  // Used from the "Deleted" tabs in Customers / Vendors / Orders pages.
  // ─────────────────────────────────────────────────────────────────────────

  /** Preview the cascade impact of permanently deleting a customer. */
  getCustomerDeletionImpact: async (customerId: string) => {
    const [orders, addresses, notifs, kyc, complaints, classifieds, foodOrders, reviews] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      supabase.from('customer_addresses').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      supabase.from('customer_notifications').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      supabase.from('kyc_documents').select('*', { count: 'exact', head: true }).eq('user_id', customerId),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', customerId),
      supabase.from('classified_ads').select('*', { count: 'exact', head: true }).eq('user_id', customerId),
      supabase.from('food_orders').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      supabase.from('reviews' as any).select('*', { count: 'exact', head: true }).eq('user_id', customerId),
    ]);
    return {
      orders: orders.count || 0,
      addresses: addresses.count || 0,
      notifications: notifs.count || 0,
      kyc_documents: kyc.count || 0,
      complaints: complaints.count || 0,
      classifieds: classifieds.count || 0,
      food_orders: foodOrders.count || 0,
      reviews: reviews.count || 0,
    };
  },

  /** Hard delete a customer and all their owned records. */
  hardDeleteCustomer: async (customerId: string) => {
    // Remove dependent rows first to avoid FK violations.
    await supabase.from('customer_addresses').delete().eq('customer_id', customerId);
    await supabase.from('customer_notifications').delete().eq('customer_id', customerId);
    await supabase.from('kyc_documents').delete().eq('user_id', customerId);
    await supabase.from('classified_ads').delete().eq('user_id', customerId);
    await supabase.from('complaints').delete().eq('user_id', customerId);
    await supabase.from('reviews' as any).delete().eq('user_id', customerId);
    await supabase.from('orders').delete().eq('customer_id', customerId);
    await supabase.from('food_orders').delete().eq('customer_id', customerId);
    await supabase.from('points_transactions' as any).delete().eq('user_id', customerId);
    await supabase.from('user_roles').delete().eq('customer_id', customerId);

    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      table_name: 'customers', operation: 'HARD_DELETE', record_id: customerId,
      old_data: { id: customerId } as any,
    });
    return { success: true };
  },

  /** Preview the cascade impact of permanently deleting a vendor. */
  getVendorDeletionImpact: async (vendorId: string) => {
    const [products, services, orders, settlements, mediaLib, notifs] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('services' as any).select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('settlements' as any).select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('media_library').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('vendor_notifications' as any).select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
    ]);
    return {
      products: products.count || 0,
      services: services.count || 0,
      orders: orders.count || 0,
      settlements: settlements.count || 0,
      media_assets: mediaLib.count || 0,
      notifications: notifs.count || 0,
    };
  },

  /** Hard delete a vendor: orders → products/services → settlements → vendor row. */
  hardDeleteVendor: async (vendorId: string) => {
    // Discover whether this is a product vendor or service vendor
    const { data: pv } = await supabase.from('vendors').select('id').eq('id', vendorId).maybeSingle();
    const table = pv ? 'vendors' : 'service_vendors';

    // 1) Get all products of this vendor → cascade orders for those products handled below
    const { data: prodRows } = await supabase.from('products').select('id').eq('vendor_id', vendorId);
    const productIds = (prodRows || []).map((p: any) => p.id);

    // 2) Delete vendor-level orders (covers product/service orders by vendor_id)
    await supabase.from('orders').delete().eq('vendor_id', vendorId);

    // 3) Delete product-side dependents then products themselves
    if (productIds.length > 0) {
      await supabase.from('product_variants' as any).delete().in('product_id', productIds);
      await supabase.from('inventory_log').delete().in('product_id', productIds);
      await supabase.from('product_attribute_map' as any).delete().in('product_id', productIds);
      await supabase.from('products').delete().in('id', productIds);
    }

    // 4) Services (for service vendors)
    await supabase.from('services' as any).delete().eq('vendor_id', vendorId);

    // 5) Settlements & vendor notifications & media library
    await supabase.from('settlements' as any).delete().eq('vendor_id', vendorId);
    await supabase.from('vendor_notifications' as any).delete().eq('vendor_id', vendorId);
    await supabase.from('media_library').delete().eq('vendor_id', vendorId);

    // 6) User role mapping
    await supabase.from('user_roles').delete().eq('vendor_id', vendorId);

    // 7) Finally remove the vendor record itself
    const { error } = await supabase.from(table as any).delete().eq('id', vendorId);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      table_name: table, operation: 'HARD_DELETE', record_id: vendorId,
      old_data: { id: vendorId, cascaded_products: productIds.length } as any,
    });
    return { success: true, cascaded_products: productIds.length };
  },

  /** Preview the cascade impact of permanently deleting one or more orders. */
  getOrdersDeletionImpact: async (orderIds: string[]) => {
    if (orderIds.length === 0) return { orders: 0, settlements: 0, payments: 0, ratings: 0 };
    const [settlements, payments, ratings] = await Promise.all([
      supabase.from('settlements' as any).select('*', { count: 'exact', head: true }).in('order_id', orderIds),
      supabase.from('payment_transactions' as any).select('*', { count: 'exact', head: true }).in('order_id', orderIds),
      supabase.from('reviews' as any).select('*', { count: 'exact', head: true }).in('order_id', orderIds),
    ]);
    return {
      orders: orderIds.length,
      settlements: settlements.count || 0,
      payments: payments.count || 0,
      ratings: ratings.count || 0,
    };
  },

  /** Hard delete orders along with their financial / report dependents. */
  hardDeleteOrders: async (orderIds: string[]) => {
    if (orderIds.length === 0) return { success: true };
    await supabase.from('settlements' as any).delete().in('order_id', orderIds);
    await supabase.from('payment_transactions' as any).delete().in('order_id', orderIds);
    await supabase.from('reviews' as any).delete().in('order_id', orderIds);
    await supabase.from('delivery_proofs').delete().in('order_id', orderIds);

    const { error } = await supabase.from('orders').delete().in('id', orderIds);
    if (error) throw error;

    await supabase.from('audit_logs').insert(
      orderIds.map((id) => ({
        table_name: 'orders', operation: 'HARD_DELETE', record_id: id,
        old_data: { id } as any,
      })) as any
    );
    return { success: true };
  },

  // Reset all data (no-op with Supabase)
  resetData: () => {
    localStorage.clear();
    window.location.reload();
  },

  // Export
  exportCSV: async (_type: string, _params: any) => {
    return { url: '#' };
  },
};
