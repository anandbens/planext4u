// API Service Layer - Supabase backed
// All operations go through the Supabase client

import { supabase } from "@/integrations/supabase/client";

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
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string; category_name?: string; emoji?: string; image?: string;
  rating?: number; reviews?: number; service_area?: string; duration?: string;
  created_at?: string; updated_at?: string;
  short_description?: string; long_description?: string;
  meta_title?: string; meta_description?: string; slug?: string;
  pricing_slots?: { label: string; duration_minutes: number; price: number }[];
  booking_duration_minutes?: number; max_bookings_per_slot?: number;
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

    // Handle referral
    if (data.referral_code) {
      const { data: referrer } = await supabase
        .from('customers')
        .select('*')
        .eq('referral_code', data.referral_code)
        .single();

      if (referrer) {
        await supabase.from('customers').update({ wallet_points: referrer.wallet_points + 100 }).eq('id', referrer.id);
        await supabase.from('referrals').insert({
          id: genId('REF'), referrer_id: referrer.id, referee_id: newId,
          status: "completed", points_awarded: 100,
          referrer_name: referrer.name, referee_name: data.name,
        });
        await supabase.from('points_transactions').insert({
          id: genId('PT'), user_id: referrer.id, type: "referral", points: 100,
          description: `Referral reward: ${data.name} joined`, user_name: referrer.name,
        });
      }
    }

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
      supabase.from('orders').select('*'),
      supabase.from('settlements').select('*'),
      supabase.from('classified_ads').select('*').eq('status', 'approved'),
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
    const { error } = await supabase.from('customers').update(filtered).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  createCustomer: async (data: Partial<User>) => {
    // Welcome bonus is configured via platform_variables (key: welcome_points). Default 200.
    let welcomePoints = 200;
    try {
      const { data: pv } = await supabase
        .from('platform_variables')
        .select('value')
        .eq('key', 'welcome_points')
        .maybeSingle();
      const parsed = Number(pv?.value);
      if (!Number.isNaN(parsed) && parsed > 0) welcomePoints = parsed;
    } catch { /* keep default */ }

    const newId = genId('USR');
    // If caller explicitly passed wallet_points, honour it; otherwise grant the configured welcome bonus.
    const initialPoints = (data.wallet_points != null) ? Number(data.wallet_points) : welcomePoints;

    const newCustomer = {
      id: newId,
      name: data.name || '',
      email: data.email || '',
      mobile: data.mobile || '',
      city_id: data.city_id || '1',
      area_id: data.area_id || '1',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      wallet_points: initialPoints,
      referral_code: `MRCP4U${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      referred_by: data.referred_by || null,
      status: data.status || 'active',
      occupation: data.occupation || '',
    };
    const { error } = await supabase.from('customers').insert(newCustomer);
    if (error) throw error;

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
      'plan_payment_status', 'plan_transaction_id', 'shop_photo_url', 'background_image', 'max_redemption_percentage', 'referred_by'];
    // UUID columns that must be null instead of empty string
    const uuidFields = ['plan_id', 'category_id', 'city_id', 'area_id'];
    // Valid columns for the `service_vendors` table (now includes plan/shop/payment cols)
    const validSvcVendorFields = ['name', 'business_name', 'mobile', 'email', 'category_id', 'city_id', 'area_id',
      'commission_rate', 'membership', 'status', 'rating', 'total_products', 'total_orders', 'total_revenue',
      'plan_id', 'plan_payment_status', 'plan_transaction_id', 'shop_photo_url', 'max_redemption_percentage', 'kyc_status', 'referred_by'];

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

    // Detect which table this id belongs to (IDs may be SVN-* for service vendors, VND-* for product vendors)
    // Important: if vendors update returns 0 rows AND no error, fall through to service_vendors instead of throwing.
    const filtered = buildFiltered(validVendorFields);
    const { data: updated, error: e1 } = await supabase.from('vendors').update(filtered).eq('id', id).select();
    if (!e1 && updated && updated.length > 0) return { success: true };

    // Either errored or no rows matched — try service_vendors as a fallback
    const svcFiltered = buildFiltered(validSvcVendorFields);
    const { data: svcUpdated, error: e2 } = await supabase.from('service_vendors').update(svcFiltered).eq('id', id).select();
    if (e2) {
      console.error("Service vendor update error:", e2);
      throw e2;
    }
    if (!svcUpdated || svcUpdated.length === 0) {
      // Neither table had a matching row updatable by this user
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
    if ((data as any).city_id) newVendor.city_id = (data as any).city_id;
    if ((data as any).area_id) newVendor.area_id = (data as any).area_id;
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
    const { data: vend } = await supabase.from('vendors').select('email, mobile').eq('id', id).single();
    if (vend) {
      const updates: Record<string, any> = {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        email: vend.email ? `${vend.email}_DEL_${ts}` : `deleted_${ts}`,
        mobile: vend.mobile ? `${vend.mobile}_DEL_${ts}` : `deleted_${ts}`,
      };
      await supabase.from('vendors').update(updates).eq('id', id);
      await supabase.from('audit_logs').insert({
        table_name: 'vendors', operation: 'SOFT_DELETE', record_id: id,
        old_data: vend, new_data: updates,
      });
    } else {
      // Try service_vendors
      const { data: sv } = await supabase.from('service_vendors').select('email, mobile').eq('id', id).single();
      const updates: Record<string, any> = {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        email: sv?.email ? `${sv.email}_DEL_${ts}` : `deleted_${ts}`,
        mobile: sv?.mobile ? `${sv.mobile}_DEL_${ts}` : `deleted_${ts}`,
      };
      await supabase.from('service_vendors').update(updates).eq('id', id);
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

    let query = supabase.from('products').select('*', { count: 'exact' });
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
      'manage_stock', 'stock_status', 'weight', 'dimensions', 'parent_item_id', 'parent_item_name', 'replacement_time'];
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
      'manage_stock', 'stock_status', 'weight', 'dimensions', 'parent_item_id', 'parent_item_name', 'replacement_time'];
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

  getProductById: async (id: string): Promise<Product | null> => {
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    return data as any;
  },

  // Services
  getServices: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('services').select('*', { count: 'exact' });
    if (params.search) query = query.or(`title.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%,category_name.ilike.%${params.search}%`);
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

  browseServices: async (params: { category?: string; search?: string; sort?: string }) => {
    let query = supabase.from('services').select('*').eq('status', 'active');
    if (params.category) query = query.ilike('category_name', `%${params.category}%`);
    if (params.search) query = query.ilike('title', `%${params.search}%`);
    if (params.sort === 'price_low') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_high') query = query.order('price', { ascending: false });
    else if (params.sort === 'rating') query = query.order('rating', { ascending: false });

    const { data } = await query;
    return (data || []) as unknown as Service[];
  },

  getServiceCategories: async () => {
    const { data } = await supabase.from('service_categories').select('*');
    return (data || []) as Category[];
  },

  // Orders
  getOrders: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('orders').select('*', { count: 'exact' });
    if (params.search) query = query.or(`id.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.date_from) query = query.gte('created_at', params.date_from);
    if (params.date_to) query = query.lte('created_at', params.date_to + 'T23:59:59Z');
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
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
  getCategories: async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    return (data || []) as Category[];
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    const validFields = ['name', 'parent_id', 'image', 'status', 'count', 'banner_image', 'icon',
      'is_trending', 'description', 'is_emergency', 'commission_rate', 'verification_status',
      'promotion_banner_url', 'promotion_title', 'promotion_active'];
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
    const validFields = ['vendor_id', 'category_id', 'title', 'description', 'price', 'tax', 'discount',
      'max_points_redeemable', 'status', 'vendor_name', 'category_name', 'emoji', 'image', 'service_area',
      'duration', 'images', 'short_description', 'long_description', 'meta_title', 'meta_description',
      'slug', 'pricing_slots', 'booking_duration_minutes', 'max_bookings_per_slot', 'updated_at'];
    const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of validFields) {
      if (key in data) {
        let val = (data as any)[key];
        if (key === 'category_id' && val === '') val = null;
        filtered[key] = val;
      }
    }
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
            status: pv.status === 'verified' ? 'active' : pv.status,
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
      'emoji', 'image', 'images', 'service_area', 'duration', 'meta_title', 'meta_description', 'slug',
      'pricing_slots', 'booking_duration_minutes', 'max_bookings_per_slot'];
    const newSrv: Record<string, any> = { id: genId('SRV'), rating: 0, reviews: 0 };
    for (const key of validFields) {
      if (key in data && (data as any)[key] !== undefined) newSrv[key] = (data as any)[key];
    }
    // Convert empty category_id to null (FK to service_categories)
    if (newSrv.category_id === '') newSrv.category_id = null;
    const { error } = await supabase.from('services').insert(newSrv as any);
    if (error) { console.error("Service create error:", error); throw error; }
    return { success: true, service: newSrv };
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

  getStates: async () => {
    const { data } = await supabase.from('states').select('*').eq('status', 'active').order('name');
    return (data || []) as { id: string; name: string; code: string }[];
  },

  getDistricts: async (stateId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('state_id', stateId).eq('status', 'active').order('name');
    return (data || []) as { id: string; name: string; state_id: string }[];
  },

  // Cities
  getCities: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('cities').select('*', { count: 'exact' });
    if (params.search) query = query.or(`name.ilike.%${params.search}%,state.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return paginateResult(data || [], count || 0, page, perPage);
  },

  // Areas
  getAreas: async (params: { page?: number; per_page?: number; search?: string; status?: string; city_id?: string }) => {
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('areas').select('*', { count: 'exact' });
    if (params.search) query = query.or(`name.ilike.%${params.search}%,city_name.ilike.%${params.search}%,pincode.ilike.%${params.search}%`);
    if (params.status && params.status !== 'all') query = query.eq('status', params.status);
    if (params.city_id) query = query.eq('city_id', params.city_id);
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
      supabase.from('banners').select('*').eq('status', 'active').order('priority', { ascending: false }),
      supabase.from('categories').select('*'),
      supabase.from('service_categories').select('*'),
      supabase.from('products').select('*').eq('status', 'active').limit(50),
      supabase.from('services').select('*').eq('status', 'active').limit(4),
      supabase.from('popup_banners').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('platform_variables').select('key, value').ilike('key', 'homepage_image_%'),
    ]);

    // Build assets map from platform variables
    const assets: Record<string, string> = {};
    (platformVars || []).forEach((v: any) => { assets[v.key] = v.value; });

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

    return {
      banners: banners || [],
      categories: categories || [],
      serviceCategories: serviceCategories || [],
      featuredProducts: verifiedProducts.slice(0, 8),
      featuredServices: featuredServices || [],
      storeBanners: storeBanners || [],
      assets,
    };
  },

  browseProducts: async (params: { category?: string; search?: string; sort?: string; userLat?: number; userLng?: number }) => {
    let query = supabase.from('products').select('*').eq('status', 'active');
    if (params.category) query = query.ilike('category_name', `%${params.category}%`);
    if (params.search) query = query.ilike('title', `%${params.search}%`);
    if (params.sort === 'price_low') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_high') query = query.order('price', { ascending: false });
    else if (params.sort === 'rating') query = query.order('rating', { ascending: false });

    const { data: products } = await query;
    if (!products?.length) return [] as Product[];

    // Apply vendor plan visibility filtering
    const vendorIds = [...new Set(products.map(p => p.vendor_id))];
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, plan_id, shop_latitude, shop_longitude, city_id, status')
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
      if (!vendor?.plan_id) return true; // no plan = show everywhere (basic)
      const plan = plansMap[vendor.plan_id];
      if (!plan || !plan.is_active) return true;
      // Check plan expiry on vendor
      if (plan.visibility_type === 'pan_india') return true;
      if (!userLat || !userLng) return true; // no user location = show all
      if (plan.visibility_type === 'radius_based') {
        const dist = haversine(userLat, userLng, vendor.shop_latitude || 0, vendor.shop_longitude || 0);
        return dist <= (plan.radius_km || 5);
      }
      // city/state visibility - show all if we can't determine
      return true;
    });

    return filtered as Product[];
  },

  getCustomerOrders: async (customerId: string) => {
    const { data } = await supabase.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
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
    let availableStock: number | null = null;
    try {
      if (variantId) {
        const { data: v } = await supabase.from('product_variants').select('stock_quantity').eq('id', variantId).maybeSingle();
        availableStock = (v as any)?.stock_quantity ?? 0;
      } else {
        const { data: p } = await supabase.from('products').select('stock').eq('id', product.id).maybeSingle();
        availableStock = (p as any)?.stock ?? null;
      }
    } catch { availableStock = null; }

    if (availableStock !== null && availableStock <= 0) {
      return {
        success: false,
        blocked: true,
        message: `${product.title} is out of stock.`,
        cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
      };
    }
    if (availableStock !== null && desiredQty > availableStock) {
      return {
        success: false,
        blocked: true,
        message: `Only ${availableStock} unit(s) of ${product.title} available.`,
        cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0),
      };
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
    const { data: orders } = await supabase.from('orders').select('*');
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
