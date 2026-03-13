// API Service Layer - All endpoints are stubs pointing to your REST API
// Replace API_BASE_URL with your actual backend URL

import {
  MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_VENDORS, MOCK_ORDERS,
  MOCK_SETTLEMENTS, MOCK_CLASSIFIEDS, MOCK_POINTS_TRANSACTIONS,
  MOCK_REFERRALS, MOCK_CATEGORIES, MOCK_BANNERS, MOCK_PLATFORM_VARIABLES,
} from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Types
export interface User {
  id: string; name: string; mobile: string; email: string;
  city_id: string; area_id: string; latitude: number; longitude: number;
  wallet_points: number; referral_code: string; referred_by: string | null;
  status: 'active' | 'inactive' | 'suspended'; created_at: string;
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
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string; category_name?: string; emoji?: string;
  rating?: number; reviews?: number; stock?: number; sales?: number;
}

export interface Order {
  id: string; customer_id: string; vendor_id: string;
  subtotal: number; tax: number; discount: number; points_used: number; total: number;
  status: 'placed' | 'paid' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  created_at: string; customer_name?: string; vendor_name?: string;
  items?: { title: string; qty: number; emoji: string; price: number }[];
}

export interface Settlement {
  id: string; vendor_id: string; order_id: string;
  amount: number; commission: number; net_amount: number;
  status: 'pending' | 'eligible' | 'settled' | 'on_hold';
  settled_at: string | null; vendor_name?: string;
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
  status: 'active' | 'inactive'; count?: number;
}

export interface Banner {
  id: string; title: string; desktop_image: string; mobile_image: string;
  link: string; priority: number; start_date: string; end_date: string;
  status: 'active' | 'inactive'; subtitle?: string; gradient?: string;
}

export interface PlatformVariable {
  id: string; key: string; value: string; description: string;
}

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; per_page: number; total_pages: number;
}

export interface DashboardStats {
  total_customers: number; total_vendors: number; total_orders: number; total_revenue: number;
  pending_settlements: number; active_ads: number;
  customers_trend: number; vendors_trend: number; orders_trend: number; revenue_trend: number;
  recent_orders: Order[];
  revenue_chart: { date: string; revenue: number; orders: number }[];
  top_vendors: { name: string; revenue: number; orders: number }[];
  category_distribution: { name: string; count: number }[];
}

// Auth token management
let authToken: string | null = localStorage.getItem('admin_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
};

const headers = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers(), ...options?.headers } });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

const MOCK_ENABLED = true;

// Helper: paginate & filter
function paginate<T>(items: T[], page = 1, perPage = 10): PaginatedResponse<T> {
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    total: items.length, page, per_page: perPage,
    total_pages: Math.ceil(items.length / perPage),
  };
}

function filterSearch<T extends Record<string, any>>(items: T[], search?: string, fields: string[] = ['name', 'title', 'email']): T[] {
  if (!search) return items;
  const q = search.toLowerCase();
  return items.filter((item) => fields.some((f) => String(item[f] || '').toLowerCase().includes(q)));
}

function filterStatus<T extends { status: string }>(items: T[], status?: string): T[] {
  return status && status !== 'all' ? items.filter((i) => i.status === status) : items;
}

// Simulate async
const delay = () => new Promise((r) => setTimeout(r, 150));

// API Methods
export const api = {
  // Auth
  login: async (email: string, _password: string) => {
    await delay();
    return { token: 'mock-jwt-token', user: { id: '1', name: 'Admin', email } };
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    await delay();
    return {
      total_customers: MOCK_CUSTOMERS.length * 2485,
      total_vendors: MOCK_VENDORS.length * 125,
      total_orders: MOCK_ORDERS.length * 1843,
      total_revenue: MOCK_VENDORS.reduce((s, v) => s + (v.total_revenue || 0), 0),
      pending_settlements: MOCK_SETTLEMENTS.filter((s) => s.status === 'pending').length * 86,
      active_ads: MOCK_CLASSIFIEDS.filter((a) => a.status === 'approved').length * 371,
      customers_trend: 12.5, vendors_trend: 8.3, orders_trend: 15.2, revenue_trend: 22.1,
      recent_orders: MOCK_ORDERS.slice(0, 5),
      revenue_chart: [
        { date: '2026-03-07', revenue: 185000, orders: 320 },
        { date: '2026-03-08', revenue: 210000, orders: 345 },
        { date: '2026-03-09', revenue: 195000, orders: 310 },
        { date: '2026-03-10', revenue: 240000, orders: 380 },
        { date: '2026-03-11', revenue: 275000, orders: 420 },
        { date: '2026-03-12', revenue: 260000, orders: 395 },
        { date: '2026-03-13', revenue: 290000, orders: 445 },
      ],
      top_vendors: MOCK_VENDORS.filter((v) => v.total_revenue).slice(0, 5).map((v) => ({
        name: v.business_name, revenue: v.total_revenue!, orders: v.total_orders!,
      })),
      category_distribution: MOCK_CATEGORIES.map((c) => ({ name: c.name, count: c.count || 0 })),
    };
  },

  // Customers
  getCustomers: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<User>>(`/admin/customers?${new URLSearchParams(params as any)}`);
    let items = filterSearch(MOCK_CUSTOMERS, params.search, ['name', 'email', 'mobile']);
    items = filterStatus(items, params.status);
    return paginate(items, params.page, params.per_page);
  },

  updateCustomer: async (id: string, data: Partial<User>) => {
    await delay();
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (idx >= 0) Object.assign(MOCK_CUSTOMERS[idx], data);
    return { success: true };
  },

  // Vendors
  getVendors: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<Vendor>>(`/admin/vendors?${new URLSearchParams(params as any)}`);
    let items = filterSearch(MOCK_VENDORS, params.search, ['name', 'business_name', 'email']);
    items = filterStatus(items, params.status);
    return paginate(items, params.page, params.per_page);
  },

  updateVendorStatus: async (id: string, status: Vendor['status']) => {
    await delay();
    const idx = MOCK_VENDORS.findIndex((v) => v.id === id);
    if (idx >= 0) MOCK_VENDORS[idx].status = status;
    return { success: true };
  },

  updateVendor: async (id: string, data: Partial<Vendor>) => {
    await delay();
    const idx = MOCK_VENDORS.findIndex((v) => v.id === id);
    if (idx >= 0) Object.assign(MOCK_VENDORS[idx], data);
    return { success: true };
  },

  // Products
  getProducts: async (params: { page?: number; per_page?: number; search?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<Product>>(`/admin/products?${new URLSearchParams(params as any)}`);
    const items = filterSearch(MOCK_PRODUCTS, params.search, ['title', 'vendor_name', 'category_name']);
    return paginate(items, params.page, params.per_page);
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    await delay();
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (idx >= 0) Object.assign(MOCK_PRODUCTS[idx], data);
    return { success: true };
  },

  getProductById: async (id: string): Promise<Product | null> => {
    await delay();
    return MOCK_PRODUCTS.find((p) => p.id === id || p.id === `PRD-${String(id).padStart(3, '0')}`) || MOCK_PRODUCTS[0];
  },

  // Orders
  getOrders: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<Order>>(`/admin/orders?${new URLSearchParams(params as any)}`);
    let items = filterSearch(MOCK_ORDERS, params.search, ['id', 'customer_name', 'vendor_name']);
    items = filterStatus(items, params.status);
    return paginate(items, params.page, params.per_page);
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    await delay();
    const idx = MOCK_ORDERS.findIndex((o) => o.id === id);
    if (idx >= 0) MOCK_ORDERS[idx].status = status;
    return { success: true };
  },

  // Settlements
  getSettlements: async (params: { page?: number; per_page?: number; status?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<Settlement>>(`/admin/settlements?${new URLSearchParams(params as any)}`);
    const items = filterStatus(MOCK_SETTLEMENTS, params.status);
    return paginate(items, params.page, params.per_page);
  },

  // Classified Ads
  getClassifiedAds: async (params: { page?: number; per_page?: number; status?: string }) => {
    await delay();
    if (!MOCK_ENABLED) return request<PaginatedResponse<ClassifiedAd>>(`/admin/classifieds?${new URLSearchParams(params as any)}`);
    const items = filterStatus(MOCK_CLASSIFIEDS, params.status);
    return paginate(items, params.page, params.per_page);
  },

  // Points
  getPointsTransactions: async (params: { page?: number; per_page?: number }) => {
    await delay();
    return paginate(MOCK_POINTS_TRANSACTIONS, params.page, params.per_page);
  },

  // Referrals
  getReferrals: async (params: { page?: number; per_page?: number }) => {
    await delay();
    return paginate(MOCK_REFERRALS, params.page, params.per_page);
  },

  // Categories
  getCategories: async () => {
    await delay();
    return MOCK_CATEGORIES;
  },

  // CMS
  getBanners: async () => {
    await delay();
    return MOCK_BANNERS;
  },

  // Platform Variables
  getPlatformVariables: async () => {
    await delay();
    return MOCK_PLATFORM_VARIABLES;
  },

  updatePlatformVariable: async (id: string, value: string) => {
    await delay();
    const idx = MOCK_PLATFORM_VARIABLES.findIndex((v) => v.id === id);
    if (idx >= 0) MOCK_PLATFORM_VARIABLES[idx].value = value;
    return { success: true };
  },

  // ===== Customer-facing APIs =====
  getCustomerHome: async () => {
    await delay();
    return {
      banners: MOCK_BANNERS.filter((b) => b.status === 'active'),
      categories: MOCK_CATEGORIES,
      featuredProducts: MOCK_PRODUCTS.filter((p) => p.status === 'active').slice(0, 8),
    };
  },

  browseProducts: async (params: { category?: string; search?: string; sort?: string }) => {
    await delay();
    let items = MOCK_PRODUCTS.filter((p) => p.status === 'active');
    if (params.category) items = items.filter((p) => p.category_name?.toLowerCase().includes(params.category!.toLowerCase()));
    if (params.search) items = items.filter((p) => p.title.toLowerCase().includes(params.search!.toLowerCase()));
    if (params.sort === 'price_low') items.sort((a, b) => a.price - b.price);
    if (params.sort === 'price_high') items.sort((a, b) => b.price - a.price);
    if (params.sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return items;
  },

  getCustomerOrders: async (customerId: string) => {
    await delay();
    return MOCK_ORDERS.filter((o) => o.customer_id === customerId || customerId === 'USR-001');
  },

  getCustomerProfile: async (customerId: string) => {
    await delay();
    const user = MOCK_CUSTOMERS.find((c) => c.id === customerId) || MOCK_CUSTOMERS[0];
    const orders = MOCK_ORDERS.filter((o) => o.customer_id === user.id);
    const referrals = MOCK_REFERRALS.filter((r) => r.referrer_id === user.id);
    return { ...user, total_orders: orders.length, total_referrals: referrals.length };
  },

  // ===== Vendor-facing APIs =====
  getVendorDashboard: async (vendorId: string) => {
    await delay();
    const vendor = MOCK_VENDORS.find((v) => v.id === vendorId) || MOCK_VENDORS[0];
    const orders = MOCK_ORDERS.filter((o) => o.vendor_id === vendor.id);
    const products = MOCK_PRODUCTS.filter((p) => p.vendor_id === vendor.id);
    const settlements = MOCK_SETTLEMENTS.filter((s) => s.vendor_id === vendor.id);
    return {
      vendor, orders, products, settlements,
      todayRevenue: orders.reduce((s, o) => s + o.total, 0),
      activeOrders: orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length,
    };
  },

  getVendorProducts: async (vendorId: string) => {
    await delay();
    return MOCK_PRODUCTS.filter((p) => p.vendor_id === vendorId || vendorId === 'VND-001');
  },

  getVendorOrders: async (vendorId: string) => {
    await delay();
    return MOCK_ORDERS.filter((o) => o.vendor_id === vendorId || vendorId === 'VND-001');
  },

  getVendorSettlements: async (vendorId: string) => {
    await delay();
    return MOCK_SETTLEMENTS.filter((s) => s.vendor_id === vendorId || vendorId === 'VND-001');
  },

  getVendorProfile: async (vendorId: string) => {
    await delay();
    return MOCK_VENDORS.find((v) => v.id === vendorId) || MOCK_VENDORS[0];
  },

  // Reports (stubs)
  getSalesReport: (params: any) => request(`/admin/reports/sales?${new URLSearchParams(params)}`),
  getVendorPerformance: (params: any) => request(`/admin/reports/vendors?${new URLSearchParams(params)}`),
  getSettlementReport: (params: any) => request(`/admin/reports/settlements?${new URLSearchParams(params)}`),
  getCustomerReport: (params: any) => request(`/admin/reports/customers?${new URLSearchParams(params)}`),
  getPointsReport: (params: any) => request(`/admin/reports/points?${new URLSearchParams(params)}`),
  getReferralReport: (params: any) => request(`/admin/reports/referrals?${new URLSearchParams(params)}`),

  // Export
  exportCSV: (type: string, params: any) => request(`/admin/export/${type}?${new URLSearchParams(params)}`, { method: 'GET' }),
};
