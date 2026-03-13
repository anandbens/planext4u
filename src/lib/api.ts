// API Service Layer - All endpoints are stubs pointing to your REST API
// Replace API_BASE_URL with your actual backend URL

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Types
export interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city_id: string;
  area_id: string;
  latitude: number;
  longitude: number;
  wallet_points: number;
  referral_code: string;
  referred_by: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  business_name: string;
  mobile: string;
  email: string;
  category_id: string;
  city_id: string;
  area_id: string;
  commission_rate: number;
  membership: string;
  status: 'pending' | 'level1_approved' | 'level2_approved' | 'verified' | 'rejected';
  created_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  tax: number;
  discount: number;
  max_points_redeemable: number;
  status: 'active' | 'inactive' | 'draft';
  vendor_name?: string;
  category_name?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  points_used: number;
  total: number;
  status: 'placed' | 'paid' | 'accepted' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  created_at: string;
  customer_name?: string;
  vendor_name?: string;
}

export interface Settlement {
  id: string;
  vendor_id: string;
  order_id: string;
  amount: number;
  commission: number;
  net_amount: number;
  status: 'pending' | 'eligible' | 'settled' | 'on_hold';
  settled_at: string | null;
  vendor_name?: string;
}

export interface ClassifiedAd {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  city: string;
  area: string;
  images: string[];
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'sold';
  created_at: string;
  user_name?: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  type: 'welcome' | 'referral' | 'order_reward';
  points: number;
  description: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: 'pending' | 'completed';
  points_awarded: number;
  created_at: string;
  referrer_name?: string;
  referee_name?: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  image: string;
  status: 'active' | 'inactive';
}

export interface Banner {
  id: string;
  title: string;
  desktop_image: string;
  mobile_image: string;
  link: string;
  priority: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
}

export interface PlatformVariable {
  id: string;
  key: string;
  value: string;
  description: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DashboardStats {
  total_customers: number;
  total_vendors: number;
  total_orders: number;
  total_revenue: number;
  pending_settlements: number;
  active_ads: number;
  customers_trend: number;
  vendors_trend: number;
  orders_trend: number;
  revenue_trend: number;
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// MOCK DATA for demo - remove when connecting to real API
const MOCK_ENABLED = true;

function mockDashboardStats(): DashboardStats {
  return {
    total_customers: 24853,
    total_vendors: 1247,
    total_orders: 18432,
    total_revenue: 2845600,
    pending_settlements: 342,
    active_ads: 1856,
    customers_trend: 12.5,
    vendors_trend: 8.3,
    orders_trend: 15.2,
    revenue_trend: 22.1,
    recent_orders: [
      { id: 'ORD-001', customer_id: '1', vendor_id: '1', subtotal: 2500, tax: 450, discount: 200, points_used: 0, total: 2750, status: 'placed', created_at: '2026-03-13T10:30:00Z', customer_name: 'Rahul Sharma', vendor_name: 'TechMart' },
      { id: 'ORD-002', customer_id: '2', vendor_id: '2', subtotal: 1200, tax: 216, discount: 0, points_used: 100, total: 1316, status: 'paid', created_at: '2026-03-13T09:15:00Z', customer_name: 'Priya Patel', vendor_name: 'FashionHub' },
      { id: 'ORD-003', customer_id: '3', vendor_id: '3', subtotal: 5800, tax: 1044, discount: 500, points_used: 0, total: 6344, status: 'delivered', created_at: '2026-03-12T16:45:00Z', customer_name: 'Amit Kumar', vendor_name: 'HomeDecor' },
      { id: 'ORD-004', customer_id: '4', vendor_id: '1', subtotal: 890, tax: 160, discount: 89, points_used: 50, total: 911, status: 'completed', created_at: '2026-03-12T14:20:00Z', customer_name: 'Sneha Reddy', vendor_name: 'TechMart' },
      { id: 'ORD-005', customer_id: '5', vendor_id: '4', subtotal: 3400, tax: 612, discount: 340, points_used: 0, total: 3672, status: 'in_progress', created_at: '2026-03-12T11:00:00Z', customer_name: 'Vikram Singh', vendor_name: 'GadgetWorld' },
    ],
    revenue_chart: [
      { date: '2026-03-07', revenue: 185000, orders: 320 },
      { date: '2026-03-08', revenue: 210000, orders: 345 },
      { date: '2026-03-09', revenue: 195000, orders: 310 },
      { date: '2026-03-10', revenue: 240000, orders: 380 },
      { date: '2026-03-11', revenue: 275000, orders: 420 },
      { date: '2026-03-12', revenue: 260000, orders: 395 },
      { date: '2026-03-13', revenue: 290000, orders: 445 },
    ],
    top_vendors: [
      { name: 'TechMart', revenue: 485000, orders: 1240 },
      { name: 'FashionHub', revenue: 392000, orders: 980 },
      { name: 'HomeDecor', revenue: 321000, orders: 756 },
      { name: 'GadgetWorld', revenue: 278000, orders: 654 },
      { name: 'BookStore Plus', revenue: 195000, orders: 520 },
    ],
    category_distribution: [
      { name: 'Electronics', count: 4520 },
      { name: 'Fashion', count: 3890 },
      { name: 'Home & Living', count: 2750 },
      { name: 'Books', count: 1820 },
      { name: 'Services', count: 1450 },
    ],
  };
}

// API Methods
export const api = {
  // Auth
  login: (email: string, password: string) =>
    MOCK_ENABLED
      ? Promise.resolve({ token: 'mock-jwt-token', user: { id: '1', name: 'Admin', email } })
      : request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Dashboard
  getDashboardStats: () =>
    MOCK_ENABLED ? Promise.resolve(mockDashboardStats()) : request<DashboardStats>('/admin/dashboard'),

  // Customers
  getCustomers: (params: { page?: number; per_page?: number; search?: string; status?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<User>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `USR-${String(i + 1).padStart(3, '0')}`,
            name: ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh', 'Anita Gupta', 'Rajesh Nair', 'Meera Joshi', 'Karan Mehta', 'Pooja Iyer'][i],
            mobile: `+91 98765 ${String(43210 + i).slice(0, 5)}`,
            email: `user${i + 1}@example.com`,
            city_id: '1', area_id: '1', latitude: 19.076, longitude: 72.877,
            wallet_points: Math.floor(Math.random() * 2000),
            referral_code: `REF${String(i + 1).padStart(4, '0')}`,
            referred_by: i % 3 === 0 ? `USR-${String(i).padStart(3, '0')}` : null,
            status: ['active', 'active', 'active', 'inactive', 'active', 'active', 'suspended', 'active', 'active', 'active'][i] as User['status'],
            created_at: new Date(2026, 0, Math.floor(Math.random() * 70) + 1).toISOString(),
          })),
          total: 24853, page: params.page || 1, per_page: params.per_page || 10, total_pages: 2486,
        })
      : request<PaginatedResponse<User>>(`/admin/customers?${new URLSearchParams(params as any)}`),

  // Vendors
  getVendors: (params: { page?: number; per_page?: number; search?: string; status?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<Vendor>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `VND-${String(i + 1).padStart(3, '0')}`,
            name: ['Ravi Kumar', 'Sanjay Patel', 'Neha Singh', 'Arjun Reddy', 'Priya Sharma', 'Deepak Gupta', 'Anjali Nair', 'Rohit Joshi', 'Kavita Mehta', 'Suresh Iyer'][i],
            business_name: ['TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus', 'FoodCorner', 'AutoParts', 'GreenGrocer', 'PetCare', 'SportsZone'][i],
            mobile: `+91 99887 ${String(76543 + i).slice(0, 5)}`,
            email: `vendor${i + 1}@example.com`,
            category_id: String(i + 1), city_id: '1', area_id: '1',
            commission_rate: [8, 10, 12, 8, 10, 15, 10, 12, 10, 8][i],
            membership: ['premium', 'basic', 'premium', 'basic', 'basic', 'premium', 'basic', 'premium', 'basic', 'basic'][i],
            status: ['verified', 'verified', 'level2_approved', 'pending', 'verified', 'level1_approved', 'verified', 'rejected', 'verified', 'pending'][i] as Vendor['status'],
            created_at: new Date(2026, 0, Math.floor(Math.random() * 70) + 1).toISOString(),
          })),
          total: 1247, page: params.page || 1, per_page: params.per_page || 10, total_pages: 125,
        })
      : request<PaginatedResponse<Vendor>>(`/admin/vendors?${new URLSearchParams(params as any)}`),

  updateVendorStatus: (id: string, status: Vendor['status']) =>
    MOCK_ENABLED ? Promise.resolve({ success: true }) : request(`/admin/vendors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateVendor: (id: string, data: Partial<Vendor>) =>
    MOCK_ENABLED ? Promise.resolve({ success: true }) : request(`/admin/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateCustomer: (id: string, data: Partial<User>) =>
    MOCK_ENABLED ? Promise.resolve({ success: true }) : request(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateProduct: (id: string, data: Partial<Product>) =>
    MOCK_ENABLED ? Promise.resolve({ success: true }) : request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateOrderStatus: (id: string, status: Order['status']) =>
    MOCK_ENABLED ? Promise.resolve({ success: true }) : request(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Products
  getProducts: (params: { page?: number; per_page?: number; search?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<Product>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `PRD-${String(i + 1).padStart(3, '0')}`,
            vendor_id: `VND-${String((i % 5) + 1).padStart(3, '0')}`,
            category_id: String((i % 5) + 1),
            title: ['Wireless Headphones', 'Cotton T-Shirt', 'Ceramic Vase', 'Smart Watch', 'Novel Collection', 'Organic Honey', 'LED Bulb Set', 'Yoga Mat', 'Dog Food Premium', 'Running Shoes'][i],
            description: 'High quality product with great features',
            price: [2499, 899, 1599, 4999, 1299, 599, 799, 1999, 2199, 3499][i],
            tax: [450, 162, 288, 900, 0, 108, 144, 360, 396, 630][i],
            discount: [250, 0, 160, 500, 130, 0, 80, 200, 0, 350][i],
            max_points_redeemable: [200, 50, 100, 500, 100, 50, 50, 150, 200, 300][i],
            status: ['active', 'active', 'active', 'draft', 'active', 'active', 'inactive', 'active', 'active', 'active'][i] as Product['status'],
            vendor_name: ['TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus', 'TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus'][i],
            category_name: ['Electronics', 'Fashion', 'Home', 'Electronics', 'Books', 'Food', 'Electronics', 'Sports', 'Pets', 'Sports'][i],
          })),
          total: 5420, page: params.page || 1, per_page: params.per_page || 10, total_pages: 542,
        })
      : request<PaginatedResponse<Product>>(`/admin/products?${new URLSearchParams(params as any)}`),

  // Orders
  getOrders: (params: { page?: number; per_page?: number; search?: string; status?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<Order>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `ORD-${String(i + 1).padStart(3, '0')}`,
            customer_id: `USR-${String((i % 5) + 1).padStart(3, '0')}`,
            vendor_id: `VND-${String((i % 5) + 1).padStart(3, '0')}`,
            subtotal: [2500, 1200, 5800, 890, 3400, 1650, 4200, 750, 2100, 6300][i],
            tax: [450, 216, 1044, 160, 612, 297, 756, 135, 378, 1134][i],
            discount: [200, 0, 500, 89, 340, 0, 420, 75, 0, 630][i],
            points_used: [0, 100, 0, 50, 0, 0, 200, 0, 100, 0][i],
            total: [2750, 1316, 6344, 911, 3672, 1947, 4336, 810, 2378, 6804][i],
            status: ['placed', 'paid', 'delivered', 'completed', 'in_progress', 'accepted', 'completed', 'cancelled', 'paid', 'placed'][i] as Order['status'],
            created_at: new Date(2026, 2, 13 - i).toISOString(),
            customer_name: ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh', 'Anita Gupta', 'Rajesh Nair', 'Meera Joshi', 'Karan Mehta', 'Pooja Iyer'][i],
            vendor_name: ['TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus', 'TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus'][i],
          })),
          total: 18432, page: params.page || 1, per_page: params.per_page || 10, total_pages: 1844,
        })
      : request<PaginatedResponse<Order>>(`/admin/orders?${new URLSearchParams(params as any)}`),

  // Settlements
  getSettlements: (params: { page?: number; per_page?: number; status?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<Settlement>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `STL-${String(i + 1).padStart(3, '0')}`,
            vendor_id: `VND-${String((i % 5) + 1).padStart(3, '0')}`,
            order_id: `ORD-${String(i + 1).padStart(3, '0')}`,
            amount: [2750, 1316, 6344, 911, 3672, 1947, 4336, 810, 2378, 6804][i],
            commission: [220, 132, 761, 73, 367, 292, 434, 97, 238, 544][i],
            net_amount: [2530, 1184, 5583, 838, 3305, 1655, 3902, 713, 2140, 6260][i],
            status: ['pending', 'eligible', 'settled', 'pending', 'settled', 'on_hold', 'eligible', 'settled', 'pending', 'eligible'][i] as Settlement['status'],
            settled_at: i % 3 === 2 ? new Date(2026, 2, 10).toISOString() : null,
            vendor_name: ['TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus', 'TechMart', 'FashionHub', 'HomeDecor', 'GadgetWorld', 'BookStore Plus'][i],
          })),
          total: 342, page: params.page || 1, per_page: params.per_page || 10, total_pages: 35,
        })
      : request<PaginatedResponse<Settlement>>(`/admin/settlements?${new URLSearchParams(params as any)}`),

  // Classified Ads
  getClassifiedAds: (params: { page?: number; per_page?: number; status?: string }) =>
    MOCK_ENABLED
      ? Promise.resolve<PaginatedResponse<ClassifiedAd>>({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `AD-${String(i + 1).padStart(3, '0')}`,
            title: ['iPhone 14 Pro', 'Honda Civic 2023', '2BHK Flat Rent', 'MacBook Air M2', 'Sofa Set', 'Guitar Acoustic', 'Bicycle MTB', 'PS5 Console', 'Study Table', 'Gold Necklace'][i],
            description: 'Well maintained, excellent condition',
            price: [65000, 1200000, 25000, 89000, 35000, 12000, 8000, 45000, 5500, 120000][i],
            category: ['Electronics', 'Vehicles', 'Real Estate', 'Electronics', 'Furniture', 'Music', 'Sports', 'Gaming', 'Furniture', 'Jewelry'][i],
            city: 'Mumbai', area: ['Andheri', 'Bandra', 'Powai', 'Juhu', 'Dadar', 'Worli', 'Malad', 'Goregaon', 'Thane', 'Navi Mumbai'][i],
            images: [], user_id: `USR-${String((i % 5) + 1).padStart(3, '0')}`,
            status: ['pending', 'approved', 'approved', 'pending', 'approved', 'rejected', 'approved', 'expired', 'approved', 'sold'][i] as ClassifiedAd['status'],
            created_at: new Date(2026, 2, 13 - i).toISOString(),
            user_name: ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anita', 'Rajesh', 'Meera', 'Karan', 'Pooja'][i],
          })),
          total: 1856, page: params.page || 1, per_page: params.per_page || 10, total_pages: 186,
        })
      : request<PaginatedResponse<ClassifiedAd>>(`/admin/classifieds?${new URLSearchParams(params as any)}`),

  // Reports (stubs)
  getSalesReport: (params: any) => request(`/admin/reports/sales?${new URLSearchParams(params)}`),
  getVendorPerformance: (params: any) => request(`/admin/reports/vendors?${new URLSearchParams(params)}`),
  getSettlementReport: (params: any) => request(`/admin/reports/settlements?${new URLSearchParams(params)}`),
  getCustomerReport: (params: any) => request(`/admin/reports/customers?${new URLSearchParams(params)}`),
  getPointsReport: (params: any) => request(`/admin/reports/points?${new URLSearchParams(params)}`),
  getReferralReport: (params: any) => request(`/admin/reports/referrals?${new URLSearchParams(params)}`),

  // CMS
  getBanners: () =>
    MOCK_ENABLED
      ? Promise.resolve<Banner[]>([
          { id: '1', title: 'Summer Sale', desktop_image: '', mobile_image: '', link: '/sale', priority: 1, start_date: '2026-03-01', end_date: '2026-03-31', status: 'active' },
          { id: '2', title: 'New Arrivals', desktop_image: '', mobile_image: '', link: '/new', priority: 2, start_date: '2026-03-01', end_date: '2026-04-30', status: 'active' },
        ])
      : request<Banner[]>('/admin/cms/banners'),

  // Platform Variables
  getPlatformVariables: () =>
    MOCK_ENABLED
      ? Promise.resolve<PlatformVariable[]>([
          { id: '1', key: 'welcome_points', value: '200', description: 'Points given to new customers' },
          { id: '2', key: 'referral_points', value: '100', description: 'Points for successful referral' },
          { id: '3', key: 'settlement_cooling_days', value: '7', description: 'Days before settlement eligible' },
          { id: '4', key: 'razorpay_sandbox', value: 'true', description: 'Razorpay sandbox mode' },
        ])
      : request<PlatformVariable[]>('/admin/platform-variables'),

  // Export
  exportCSV: (type: string, params: any) =>
    request(`/admin/export/${type}?${new URLSearchParams(params)}`, { method: 'GET' }),
};
