// API Service Layer with localStorage persistence
// All mutations are saved to localStorage automatically

import {
  MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_VENDORS, MOCK_ORDERS,
  MOCK_SETTLEMENTS, MOCK_CLASSIFIEDS, MOCK_POINTS_TRANSACTIONS,
  MOCK_REFERRALS, MOCK_CATEGORIES, MOCK_BANNERS, MOCK_PLATFORM_VARIABLES,
  MOCK_SERVICES, MOCK_SERVICE_CATEGORIES, MOCK_SERVICE_VENDORS, MOCK_CLASSIFIED_CATEGORIES,
  MOCK_OCCUPATIONS, MOCK_CITIES, MOCK_AREAS, MOCK_TAX_CONFIG,
  MOCK_POPUP_BANNERS, MOCK_ADVERTISEMENTS, MOCK_WEBSITE_QUERIES, MOCK_REPORT_LOG,
  MOCK_SUPPORT_TICKETS,
  persist,
} from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string; category_name?: string; emoji?: string;
  rating?: number; reviews?: number; stock?: number; sales?: number;
  created_at?: string; updated_at?: string;
}

export interface Service {
  id: string; vendor_id: string; category_id: string; title: string; description: string;
  price: number; tax: number; discount: number; max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string; category_name?: string; emoji?: string;
  rating?: number; reviews?: number; service_area?: string; duration?: string;
  created_at?: string;
}

export interface Order {
  id: string; customer_id: string; vendor_id: string;
  subtotal: number; tax: number; discount: number; points_used: number; total: number;
  status: 'placed' | 'paid' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  created_at: string; updated_at?: string; customer_name?: string; vendor_name?: string;
  items?: { title: string; qty: number; emoji: string; price: number }[];
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
  vendor_id: string; emoji: string; maxPoints: number; tax: number; discount: number;
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

function filterDateRange<T extends Record<string, any>>(items: T[], dateFrom?: string, dateTo?: string, dateField: string = 'created_at'): T[] {
  let result = items;
  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    result = result.filter((i) => new Date(i[dateField]) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((i) => new Date(i[dateField]) <= to);
  }
  return result;
}

const delay = () => new Promise((r) => setTimeout(r, 150));

// API Methods
export const api = {
  // Auth
  login: async (email: string, _password: string) => {
    await delay();
    return { token: 'mock-jwt-token', user: { id: '1', name: 'Admin', email } };
  },

  // Customer Registration
  registerCustomer: async (data: { name: string; mobile: string; email: string; city: string; area: string; referral_code?: string; occupation?: string }) => {
    await delay();
    const newId = `USR-${String(MOCK_CUSTOMERS.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newCustomer = {
      id: newId, name: data.name, mobile: data.mobile, email: data.email,
      city_id: "1", area_id: "1", latitude: 19.076, longitude: 72.877,
      wallet_points: 200, referral_code: `REF${String(MOCK_CUSTOMERS.length + 1).padStart(4, '0')}`,
      referred_by: data.referral_code || null, status: "active" as const, created_at: now,
      occupation: data.occupation || "",
    };
    MOCK_CUSTOMERS.push(newCustomer);
    persist('customers', MOCK_CUSTOMERS);

    // Add welcome points transaction
    const ptId = `PT-${String(MOCK_POINTS_TRANSACTIONS.length + 1).padStart(3, '0')}`;
    MOCK_POINTS_TRANSACTIONS.push({
      id: ptId, user_id: newId, type: "welcome", points: 200,
      description: "Welcome bonus on registration", created_at: now, user_name: data.name,
    });
    persist('points_transactions', MOCK_POINTS_TRANSACTIONS);

    // Handle referral
    if (data.referral_code) {
      const referrer = MOCK_CUSTOMERS.find((c) => c.referral_code === data.referral_code);
      if (referrer) {
        referrer.wallet_points += 100;
        persist('customers', MOCK_CUSTOMERS);

        const refId = `REF-${String(MOCK_REFERRALS.length + 1).padStart(3, '0')}`;
        MOCK_REFERRALS.push({
          id: refId, referrer_id: referrer.id, referee_id: newId,
          status: "completed", points_awarded: 100, created_at: now,
          referrer_name: referrer.name, referee_name: data.name,
        });
        persist('referrals', MOCK_REFERRALS);

        const rptId = `PT-${String(MOCK_POINTS_TRANSACTIONS.length + 1).padStart(3, '0')}`;
        MOCK_POINTS_TRANSACTIONS.push({
          id: rptId, user_id: referrer.id, type: "referral", points: 100,
          description: `Referral reward: ${data.name} joined`, created_at: now, user_name: referrer.name,
        });
        persist('points_transactions', MOCK_POINTS_TRANSACTIONS);
      }
    }

    return { success: true, user: newCustomer, token: 'mock-customer-token' };
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    await delay();
    return {
      total_customers: MOCK_CUSTOMERS.length,
      total_vendors: MOCK_VENDORS.length + MOCK_SERVICE_VENDORS.length,
      total_orders: MOCK_ORDERS.length,
      total_revenue: MOCK_ORDERS.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
      pending_settlements: MOCK_SETTLEMENTS.filter((s) => s.status === 'pending').length,
      active_ads: MOCK_CLASSIFIEDS.filter((a) => a.status === 'approved').length,
      total_services: MOCK_SERVICES.length,
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
      top_vendors: [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS].filter((v) => v.total_revenue).sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 5).map((v) => ({
        name: v.business_name, revenue: v.total_revenue!, orders: v.total_orders!,
      })),
      category_distribution: [...MOCK_CATEGORIES, ...MOCK_SERVICE_CATEGORIES].map((c) => ({ name: c.name, count: c.count || 0 })),
    };
  },

  // Customers
  getCustomers: async (params: { page?: number; per_page?: number; search?: string; status?: string; occupation?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterSearch(MOCK_CUSTOMERS, params.search, ['name', 'email', 'mobile', 'occupation']);
    items = filterStatus(items, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    if (params.occupation) items = items.filter((c) => c.occupation === params.occupation);
    return paginate(items, params.page, params.per_page);
  },

  updateCustomer: async (id: string, data: Partial<User>) => {
    await delay();
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (idx >= 0) { Object.assign(MOCK_CUSTOMERS[idx], data); persist('customers', MOCK_CUSTOMERS); }
    return { success: true };
  },

  createCustomer: async (data: Omit<User, 'id' | 'created_at' | 'referral_code'>) => {
    await delay();
    const newCustomer: User = {
      id: `USR-${String(MOCK_CUSTOMERS.length + 1).padStart(3, '0')}`,
      ...data as any,
      referral_code: `REF${String(MOCK_CUSTOMERS.length + 1).padStart(4, '0')}`,
      wallet_points: data.wallet_points || 0,
      created_at: new Date().toISOString(),
    };
    MOCK_CUSTOMERS.unshift(newCustomer);
    persist('customers', MOCK_CUSTOMERS);
    return { success: true, customer: newCustomer };
  },

  deleteCustomer: async (id: string) => {
    await delay();
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (idx >= 0) { MOCK_CUSTOMERS.splice(idx, 1); persist('customers', MOCK_CUSTOMERS); }
    return { success: true };
  },

  // Vendors
  getVendors: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    const allVendors = [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS];
    let items = filterSearch(allVendors, params.search, ['name', 'business_name', 'email']);
    items = filterStatus(items, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  updateVendorStatus: async (id: string, status: string) => {
    await delay();
    const idx = MOCK_VENDORS.findIndex((v) => v.id === id);
    if (idx >= 0) { (MOCK_VENDORS[idx] as any).status = status; persist('vendors', MOCK_VENDORS); }
    else {
      const sIdx = MOCK_SERVICE_VENDORS.findIndex((v) => v.id === id);
      if (sIdx >= 0) { (MOCK_SERVICE_VENDORS[sIdx] as any).status = status; persist('service_vendors', MOCK_SERVICE_VENDORS); }
    }
    return { success: true };
  },

  updateVendor: async (id: string, data: Partial<Vendor>) => {
    await delay();
    const idx = MOCK_VENDORS.findIndex((v) => v.id === id);
    if (idx >= 0) { Object.assign(MOCK_VENDORS[idx], data); persist('vendors', MOCK_VENDORS); }
    else {
      const sIdx = MOCK_SERVICE_VENDORS.findIndex((v) => v.id === id);
      if (sIdx >= 0) { Object.assign(MOCK_SERVICE_VENDORS[sIdx], data); persist('service_vendors', MOCK_SERVICE_VENDORS); }
    }
    return { success: true };
  },

  createVendor: async (data: Partial<Vendor>, type: 'product' | 'service' = 'product') => {
    await delay();
    const store = type === 'service' ? MOCK_SERVICE_VENDORS : MOCK_VENDORS;
    const newVendor: any = {
      id: `VND-${String(MOCK_VENDORS.length + MOCK_SERVICE_VENDORS.length + 1).padStart(3, '0')}`,
      ...data,
      status: 'pending',
      total_products: 0, total_orders: 0, total_revenue: 0,
      created_at: new Date().toISOString(),
    };
    store.unshift(newVendor);
    persist(type === 'service' ? 'service_vendors' : 'vendors', store);
    return { success: true, vendor: newVendor };
  },

  deleteVendor: async (id: string) => {
    await delay();
    let idx = MOCK_VENDORS.findIndex((v) => v.id === id);
    if (idx >= 0) { MOCK_VENDORS.splice(idx, 1); persist('vendors', MOCK_VENDORS); }
    else {
      idx = MOCK_SERVICE_VENDORS.findIndex((v) => v.id === id);
      if (idx >= 0) { MOCK_SERVICE_VENDORS.splice(idx, 1); persist('service_vendors', MOCK_SERVICE_VENDORS); }
    }
    return { success: true };
  },

  // Products
  getProducts: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterSearch(MOCK_PRODUCTS, params.search, ['title', 'vendor_name', 'category_name']);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    await delay();
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (idx >= 0) { Object.assign(MOCK_PRODUCTS[idx], data, { updated_at: new Date().toISOString() }); persist('products', MOCK_PRODUCTS); }
    return { success: true };
  },

  createProduct: async (data: Partial<Product>) => {
    await delay();
    const newProduct: any = {
      id: `PRD-${String(MOCK_PRODUCTS.length + 1).padStart(3, '0')}`,
      ...data,
      rating: 0, reviews: 0, stock: data.stock || 0, sales: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_PRODUCTS.unshift(newProduct);
    persist('products', MOCK_PRODUCTS);
    return { success: true, product: newProduct };
  },

  deleteProduct: async (id: string) => {
    await delay();
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
    if (idx >= 0) { MOCK_PRODUCTS.splice(idx, 1); persist('products', MOCK_PRODUCTS); }
    return { success: true };
  },

  getProductById: async (id: string): Promise<Product | null> => {
    await delay();
    return MOCK_PRODUCTS.find((p) => p.id === id || p.id === `PRD-${String(id).padStart(3, '0')}`) || MOCK_PRODUCTS[0];
  },

  // Services
  getServices: async (params: { page?: number; per_page?: number; search?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterSearch(MOCK_SERVICES, params.search, ['title', 'vendor_name', 'category_name']);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  getServiceById: async (id: string): Promise<Service | null> => {
    await delay();
    return MOCK_SERVICES.find((s) => s.id === id) || MOCK_SERVICES[0];
  },

  browseServices: async (params: { category?: string; search?: string; sort?: string }) => {
    await delay();
    let items = [...MOCK_SERVICES].filter((s) => s.status === 'active');
    if (params.category) items = items.filter((s) => s.category_name?.toLowerCase().includes(params.category!.toLowerCase()));
    if (params.search) items = items.filter((s) => s.title.toLowerCase().includes(params.search!.toLowerCase()));
    if (params.sort === 'price_low') items.sort((a, b) => a.price - b.price);
    if (params.sort === 'price_high') items.sort((a, b) => b.price - a.price);
    if (params.sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return items;
  },

  getServiceCategories: async () => {
    await delay();
    return MOCK_SERVICE_CATEGORIES;
  },

  // Orders
  getOrders: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterSearch(MOCK_ORDERS, params.search, ['id', 'customer_name', 'vendor_name']);
    items = filterStatus(items, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    await delay();
    const idx = MOCK_ORDERS.findIndex((o) => o.id === id);
    if (idx >= 0) {
      MOCK_ORDERS[idx].status = status;
      MOCK_ORDERS[idx].updated_at = new Date().toISOString();
      persist('orders', MOCK_ORDERS);

      // If completed, create settlement
      if (status === 'completed') {
        const order = MOCK_ORDERS[idx];
        const vendor = [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS].find(v => v.id === order.vendor_id);
        const commRate = vendor?.commission_rate || 10;
        const commission = Math.round(order.total * commRate / 100);
        const stlId = `STL-${String(MOCK_SETTLEMENTS.length + 1).padStart(3, '0')}`;
        MOCK_SETTLEMENTS.push({
          id: stlId, vendor_id: order.vendor_id, order_id: order.id,
          amount: order.total, commission, net_amount: order.total - commission,
          status: 'pending', settled_at: null, created_at: new Date().toISOString(),
          vendor_name: order.vendor_name,
        });
        persist('settlements', MOCK_SETTLEMENTS);

        // Award loyalty points (2% of order value)
        const rewardPoints = Math.round(order.total * 0.02);
        const customer = MOCK_CUSTOMERS.find(c => c.id === order.customer_id);
        if (customer) {
          customer.wallet_points += rewardPoints;
          persist('customers', MOCK_CUSTOMERS);

          const ptId = `PT-${String(MOCK_POINTS_TRANSACTIONS.length + 1).padStart(3, '0')}`;
          MOCK_POINTS_TRANSACTIONS.push({
            id: ptId, user_id: customer.id, type: 'order_reward', points: rewardPoints,
            description: `2% reward on order ${order.id}`, created_at: new Date().toISOString(),
            user_name: customer.name,
          });
          persist('points_transactions', MOCK_POINTS_TRANSACTIONS);
        }

        // Update vendor stats
        if (vendor) {
          vendor.total_orders = (vendor.total_orders || 0) + 1;
          vendor.total_revenue = (vendor.total_revenue || 0) + order.total;
          if (MOCK_VENDORS.includes(vendor as any)) persist('vendors', MOCK_VENDORS);
          else persist('service_vendors', MOCK_SERVICE_VENDORS);
        }
      }
    }
    return { success: true };
  },

  // Place order from cart
  placeOrder: async (cartItems: CartItem[], customerId: string, pointsUsed: number, discount: number) => {
    await delay();
    const now = new Date().toISOString();
    const customer = MOCK_CUSTOMERS.find(c => c.id === customerId) || MOCK_CUSTOMERS[0];

    // Group items by vendor
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
      const orderId = `ORD-${String(MOCK_ORDERS.length + 1).padStart(3, '0')}`;

      const order: Order = {
        id: orderId, customer_id: customer.id, vendor_id: vendorId,
        subtotal, tax, discount: discountPerOrder, points_used: pointsPerOrder,
        total: subtotal + tax - discountPerOrder - pointsPerOrder,
        status: 'placed', created_at: now, updated_at: now,
        customer_name: customer.name, vendor_name: items[0].vendor,
        items: items.map(i => ({ title: i.title, qty: i.qty, emoji: i.emoji, price: i.price })),
      };
      (MOCK_ORDERS as Order[]).unshift(order);
      orders.push(order);
    }
    persist('orders', MOCK_ORDERS);

    // Deduct points from customer wallet
    if (pointsUsed > 0) {
      customer.wallet_points -= pointsUsed;
      persist('customers', MOCK_CUSTOMERS);
    }

    return { success: true, orders };
  },

  // Settlements
  getSettlements: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterStatus(MOCK_SETTLEMENTS, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  settleSettlement: async (id: string) => {
    await delay();
    const idx = MOCK_SETTLEMENTS.findIndex(s => s.id === id);
    if (idx >= 0) {
      MOCK_SETTLEMENTS[idx].status = 'settled';
      MOCK_SETTLEMENTS[idx].settled_at = new Date().toISOString();
      persist('settlements', MOCK_SETTLEMENTS);
    }
    return { success: true };
  },

  // Classified Ads
  getClassifiedAds: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterStatus(MOCK_CLASSIFIEDS, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  updateClassifiedStatus: async (id: string, status: ClassifiedAd['status']) => {
    await delay();
    const idx = MOCK_CLASSIFIEDS.findIndex(a => a.id === id);
    if (idx >= 0) { (MOCK_CLASSIFIEDS[idx] as any).status = status; persist('classifieds', MOCK_CLASSIFIEDS); }
    return { success: true };
  },

  postClassifiedAd: async (data: { title: string; description: string; price: number; category: string; city: string; area: string }) => {
    await delay();
    const newAd = {
      id: `AD-${String(MOCK_CLASSIFIEDS.length + 1).padStart(3, '0')}`,
      ...data, images: [] as string[], user_id: "USR-001", status: "pending" as const,
      created_at: new Date().toISOString(), user_name: "Rahul Sharma",
    };
    MOCK_CLASSIFIEDS.unshift(newAd);
    persist('classifieds', MOCK_CLASSIFIEDS);
    return { success: true, ad: newAd };
  },

  getCustomerClassifieds: async (userId: string) => {
    await delay();
    return MOCK_CLASSIFIEDS.filter((ad) => ad.user_id === userId || userId === 'USR-001');
  },

  getBrowseClassifieds: async (params: { category?: string; search?: string }) => {
    await delay();
    let items = MOCK_CLASSIFIEDS.filter((ad) => ad.status === 'approved');
    if (params.category) items = items.filter((ad) => ad.category.toLowerCase().includes(params.category!.toLowerCase()));
    if (params.search) items = items.filter((ad) => ad.title.toLowerCase().includes(params.search!.toLowerCase()));
    return items;
  },

  getClassifiedCategories: () => MOCK_CLASSIFIED_CATEGORIES,

  // Points
  getPointsTransactions: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    await delay();
    let items = [...MOCK_POINTS_TRANSACTIONS];
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  // Referrals
  getReferrals: async (params: { page?: number; per_page?: number; date_from?: string; date_to?: string }) => {
    await delay();
    let items = [...MOCK_REFERRALS];
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  // Categories
  getCategories: async () => {
    await delay();
    return MOCK_CATEGORIES;
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    await delay();
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
    if (idx >= 0) { Object.assign(MOCK_CATEGORIES[idx], data); persist('categories', MOCK_CATEGORIES); }
    return { success: true };
  },

  createCategory: async (data: Partial<Category>) => {
    await delay();
    const newCat: any = {
      id: String(MOCK_CATEGORIES.length + 1),
      ...data,
      count: 0,
      created_at: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(newCat);
    persist('categories', MOCK_CATEGORIES);
    return { success: true, category: newCat };
  },

  deleteCategory: async (id: string) => {
    await delay();
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
    if (idx >= 0) { MOCK_CATEGORIES.splice(idx, 1); persist('categories', MOCK_CATEGORIES); }
    return { success: true };
  },

  // Services CRUD
  updateService: async (id: string, data: Partial<Service>) => {
    await delay();
    const idx = MOCK_SERVICES.findIndex((s) => s.id === id);
    if (idx >= 0) { Object.assign(MOCK_SERVICES[idx], data); persist('services', MOCK_SERVICES); }
    return { success: true };
  },

  createService: async (data: Partial<Service>) => {
    await delay();
    const newSrv: any = {
      id: `SRV-${String(MOCK_SERVICES.length + 1).padStart(3, '0')}`,
      ...data,
      rating: 0, reviews: 0,
      created_at: new Date().toISOString(),
    };
    MOCK_SERVICES.unshift(newSrv);
    persist('services', MOCK_SERVICES);
    return { success: true, service: newSrv };
  },

  deleteService: async (id: string) => {
    await delay();
    const idx = MOCK_SERVICES.findIndex((s) => s.id === id);
    if (idx >= 0) { MOCK_SERVICES.splice(idx, 1); persist('services', MOCK_SERVICES); }
    return { success: true };
  },


  // CMS
  getBanners: async () => {
    await delay();
    return MOCK_BANNERS;
  },

  updateBanner: async (id: string, data: Partial<Banner>) => {
    await delay();
    const idx = MOCK_BANNERS.findIndex((b) => b.id === id);
    if (idx >= 0) { Object.assign(MOCK_BANNERS[idx], data); persist('banners', MOCK_BANNERS); }
    return { success: true };
  },

  // Platform Variables
  getPlatformVariables: async () => {
    await delay();
    return MOCK_PLATFORM_VARIABLES;
  },

  updatePlatformVariable: async (id: string, value: string) => {
    await delay();
    const idx = MOCK_PLATFORM_VARIABLES.findIndex((v) => v.id === id);
    if (idx >= 0) { MOCK_PLATFORM_VARIABLES[idx].value = value; persist('platform_variables', MOCK_PLATFORM_VARIABLES); }
    return { success: true };
  },

  // Occupations
  getOccupations: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    await delay();
    let items = filterSearch(MOCK_OCCUPATIONS, params.search, ['name']);
    items = filterStatus(items, params.status);
    return paginate(items, params.page, params.per_page);
  },

  updateOccupation: async (id: string, data: Partial<Occupation>) => {
    await delay();
    const idx = MOCK_OCCUPATIONS.findIndex((o) => o.id === id);
    if (idx >= 0) { Object.assign(MOCK_OCCUPATIONS[idx], data); persist('occupations', MOCK_OCCUPATIONS); }
    return { success: true };
  },

  // Cities
  getCities: async (params: { page?: number; per_page?: number; search?: string; status?: string }) => {
    await delay();
    let items = filterSearch(MOCK_CITIES, params.search, ['name', 'state']);
    items = filterStatus(items, params.status);
    return paginate(items, params.page, params.per_page);
  },

  // Areas
  getAreas: async (params: { page?: number; per_page?: number; search?: string; status?: string; city_id?: string }) => {
    await delay();
    let items = filterSearch(MOCK_AREAS, params.search, ['name', 'city_name', 'pincode']);
    items = filterStatus(items, params.status);
    if (params.city_id) items = items.filter((a) => a.city_id === params.city_id);
    return paginate(items, params.page, params.per_page);
  },

  // Tax Config
  getTaxConfig: async (params: { page?: number; per_page?: number; status?: string }) => {
    await delay();
    const items = filterStatus(MOCK_TAX_CONFIG, params.status);
    return paginate(items, params.page, params.per_page);
  },

  // Popup Banners
  getPopupBanners: async (params: { page?: number; per_page?: number; status?: string }) => {
    await delay();
    const items = filterStatus(MOCK_POPUP_BANNERS, params.status);
    return paginate(items, params.page, params.per_page);
  },

  // Advertisements
  getAdvertisements: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterStatus(MOCK_ADVERTISEMENTS, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  // Website Queries
  getWebsiteQueries: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterStatus(MOCK_WEBSITE_QUERIES, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  updateWebsiteQueryStatus: async (id: string, status: WebsiteQuery['status']) => {
    await delay();
    const idx = MOCK_WEBSITE_QUERIES.findIndex((q) => q.id === id);
    if (idx >= 0) { (MOCK_WEBSITE_QUERIES[idx] as any).status = status; persist('website_queries', MOCK_WEBSITE_QUERIES); }
    return { success: true };
  },

  // Report Log
  getReportLog: async (params: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterStatus(MOCK_REPORT_LOG, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  // ===== Customer-facing APIs =====
  getCustomerHome: async () => {
    await delay();
    return {
      banners: MOCK_BANNERS.filter((b) => b.status === 'active'),
      categories: MOCK_CATEGORIES,
      serviceCategories: MOCK_SERVICE_CATEGORIES,
      featuredProducts: MOCK_PRODUCTS.filter((p) => p.status === 'active').slice(0, 8),
      featuredServices: MOCK_SERVICES.filter((s) => s.status === 'active').slice(0, 4),
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

  // Cart
  getCart: async (): Promise<CartItem[]> => {
    await delay();
    const { loadCart } = await import('./persist');
    return loadCart();
  },

  addToCart: async (product: Product, qty: number = 1) => {
    await delay();
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart();
    const existing = cart.find((i: CartItem) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id, title: product.title, price: product.price, qty,
        vendor: product.vendor_name || '', vendor_id: product.vendor_id,
        emoji: product.emoji || '📦', maxPoints: product.max_points_redeemable,
        tax: product.tax, discount: product.discount,
      });
    }
    saveCart(cart);
    return { success: true, cartCount: cart.reduce((s: number, i: CartItem) => s + i.qty, 0) };
  },

  updateCartItem: async (itemId: string, qty: number) => {
    await delay();
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
    await delay();
    const { loadCart, saveCart } = await import('./persist');
    const cart = loadCart().filter((i: CartItem) => i.id !== itemId);
    saveCart(cart);
    return { success: true };
  },

  clearCart: async () => {
    await delay();
    const { saveCart } = await import('./persist');
    saveCart([]);
    return { success: true };
  },

  // ===== Vendor-facing APIs =====
  getVendorDashboard: async (vendorId: string) => {
    await delay();
    const vendor = [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS].find((v) => v.id === vendorId) || MOCK_VENDORS[0];
    const orders = MOCK_ORDERS.filter((o) => o.vendor_id === vendor.id);
    const products = MOCK_PRODUCTS.filter((p) => p.vendor_id === vendor.id);
    const services = MOCK_SERVICES.filter((s) => s.vendor_id === vendor.id);
    const settlements = MOCK_SETTLEMENTS.filter((s) => s.vendor_id === vendor.id);
    return {
      vendor, orders, products, services, settlements,
      todayRevenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
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
    return [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS].find((v) => v.id === vendorId) || MOCK_VENDORS[0];
  },

  // Reports
  getSalesReport: async (_params: any) => {
    await delay();
    return {
      summary: {
        total_sales: MOCK_ORDERS.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
        total_orders: MOCK_ORDERS.length,
        avg_order_value: Math.round(MOCK_ORDERS.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0) / Math.max(MOCK_ORDERS.length, 1)),
        total_tax: MOCK_ORDERS.reduce((s, o) => s + o.tax, 0),
      },
      chart: [
        { month: 'Oct', sales: 380000, orders: 1650 }, { month: 'Nov', sales: 420000, orders: 1820 },
        { month: 'Dec', sales: 510000, orders: 2210 }, { month: 'Jan', sales: 390000, orders: 1690 },
        { month: 'Feb', sales: 450000, orders: 1950 }, { month: 'Mar', sales: 740000, orders: 3130 },
      ],
    };
  },
  getVendorPerformance: async (_params: any) => {
    await delay();
    return { vendors: [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS].filter((v) => v.total_revenue) };
  },
  getSettlementReport: async (_params: any) => {
    await delay();
    return {
      settlements: MOCK_SETTLEMENTS,
      summary: {
        total_settled: MOCK_SETTLEMENTS.filter(s => s.status === 'settled').reduce((sum, s) => sum + s.net_amount, 0),
        total_pending: MOCK_SETTLEMENTS.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.net_amount, 0),
        total_commission: MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.commission, 0),
      },
    };
  },
  getCustomerReport: async (_params: any) => {
    await delay();
    return { customers: MOCK_CUSTOMERS, summary: { total: MOCK_CUSTOMERS.length, active: MOCK_CUSTOMERS.filter((c) => c.status === 'active').length } };
  },
  getPointsReport: async (_params: any) => {
    await delay();
    return { transactions: MOCK_POINTS_TRANSACTIONS };
  },
  getReferralReport: async (_params: any) => {
    await delay();
    return { referrals: MOCK_REFERRALS };
  },

  // Support Tickets
  getSupportTickets: async (params: { page?: number; per_page?: number; search?: string; status?: string; date_from?: string; date_to?: string }) => {
    await delay();
    let items = filterSearch(MOCK_SUPPORT_TICKETS, params.search, ['subject', 'customer_name', 'category', 'id']);
    items = filterStatus(items, params.status);
    items = filterDateRange(items, params.date_from, params.date_to);
    return paginate(items, params.page, params.per_page);
  },

  resolveTicket: async (id: string, status: string, resolution: string) => {
    await delay();
    const idx = MOCK_SUPPORT_TICKETS.findIndex(t => t.id === id);
    if (idx >= 0) {
      (MOCK_SUPPORT_TICKETS[idx] as any).status = status;
      (MOCK_SUPPORT_TICKETS[idx] as any).resolution_notes = resolution;
      MOCK_SUPPORT_TICKETS[idx].updated_at = new Date().toISOString();
      persist('support_tickets');
    }
    return { success: true };
  },

  createSupportTicket: async (data: { subject: string; description: string; category: string; priority: string; customer_id: string }) => {
    await delay();
    const customer = MOCK_CUSTOMERS.find(c => c.id === data.customer_id) || MOCK_CUSTOMERS[0];
    const now = new Date().toISOString();
    const newTicket = {
      id: `TKT-${String(MOCK_SUPPORT_TICKETS.length + 1).padStart(3, '0')}`,
      ...data, status: "open", customer_name: customer.name, phone: customer.mobile,
      assigned_to: "Unassigned", resolution: "", created_at: now, updated_at: now,
    };
    MOCK_SUPPORT_TICKETS.unshift(newTicket as any);
    persist('support_tickets');
    return { success: true, ticket: newTicket };
  },

  // Reset all data
  resetData: () => {
    const { resetAllStores } = require('./persist');
    resetAllStores();
    window.location.reload();
  },

  // Export
  exportCSV: async (type: string, _params: any) => {
    await delay();
    return { url: '#' };
  },
};
