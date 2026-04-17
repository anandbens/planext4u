import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/lib/geo-utils";

export interface Restaurant {
  id: string;
  vendor_id?: string | null;
  name: string;
  tagline?: string | null;
  description?: string | null;
  cuisine: string[];
  veg_only: boolean;
  cover_image?: string | null;
  logo_url?: string | null;
  fssai_license?: string | null;
  address: string;
  city_id?: string | null;
  area_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  avg_prep_minutes: number;
  delivery_radius_km: number;
  packaging_fee: number;
  min_order_amount: number;
  commission_rate: number;
  status: 'open' | 'closed' | 'busy' | 'offline';
  is_active: boolean;
  rating: number;
  reviews_count: number;
  total_orders: number;
  banner_url?: string | null;
  gallery_urls?: string[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  discounted_price?: number | null;
  is_veg: boolean;
  spice_level?: string | null;
  image_url?: string | null;
  addons: any[];
  customizations: any[];
  serves: number;
  prep_minutes: number;
  gst_rate: number;
  in_stock: boolean;
  is_bestseller: boolean;
  display_order: number;
  dietary_tags?: string[];
  calories?: number | null;
  gallery_urls?: string[];
  order_count?: number;
}

export interface MenuCombo {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  item_ids: string[];
  original_price: number;
  combo_price: number;
  is_active: boolean;
  display_order: number;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface FoodOrder {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  restaurant_id: string;
  restaurant_name?: string | null;
  items: any[];
  subtotal: number;
  packaging_fee: number;
  delivery_fee: number;
  rider_tip: number;
  gst: number;
  platform_fee: number;
  discount: number;
  points_used: number;
  total: number;
  rider_payout: number;
  restaurant_payout: number;
  p4u_cut: number;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  distance_km?: number | null;
  eta_minutes?: number | null;
  handover_otp?: string | null;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: string;
  customer_notes?: string | null;
  cancellation_reason?: string | null;
  placed_at: string;
  accepted_at?: string | null;
  ready_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  user_id?: string | null;
  name: string;
  mobile: string;
  email?: string | null;
  vehicle_type: string;
  vehicle_number?: string | null;
  city_id?: string | null;
  area_id?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
  is_online: boolean;
  kyc_status: string;
  status: string;
  rating: number;
  total_deliveries: number;
  total_earnings: number;
}

const FOOD_DELIVERY_BASE_FEE = 25;
const FOOD_DELIVERY_PER_KM = 8;
const FOOD_RIDER_PAYOUT_BASE = 20;
const FOOD_RIDER_PAYOUT_PER_KM = 6;
const FOOD_PLATFORM_FEE_FLAT = 5;

export function calculateDeliveryFee(distanceKm: number) {
  const fee = FOOD_DELIVERY_BASE_FEE + Math.max(0, distanceKm - 1) * FOOD_DELIVERY_PER_KM;
  return Math.round(fee);
}

export function calculateRiderPayout(distanceKm: number) {
  const payout = FOOD_RIDER_PAYOUT_BASE + Math.max(0, distanceKm) * FOOD_RIDER_PAYOUT_PER_KM;
  return Math.round(payout);
}

export function calculateETA(distanceKm: number, prepMinutes: number) {
  // ~30 km/h average travel speed
  const travelMinutes = Math.ceil((distanceKm / 30) * 60);
  return prepMinutes + travelMinutes + 5;
}

export const foodApi = {
  // ─── Restaurants ─────────────────────────────────────────────
  listRestaurants: async (opts: { lat?: number; lng?: number; vegOnly?: boolean; cuisine?: string; search?: string } = {}) => {
    let query = supabase.from('restaurants').select('*').eq('is_active', true);
    if (opts.vegOnly) query = query.eq('veg_only', true);
    if (opts.cuisine) query = query.contains('cuisine', [opts.cuisine]);
    if (opts.search) query = query.ilike('name', `%${opts.search}%`);
    const { data, error } = await query.order('rating', { ascending: false });
    if (error) throw error;
    let restaurants = (data || []) as Restaurant[];
    if (opts.lat != null && opts.lng != null) {
      restaurants = restaurants
        .map(r => ({
          ...r,
          distance_km: r.latitude && r.longitude ? haversineDistance(opts.lat!, opts.lng!, r.latitude, r.longitude) : null,
        }))
        .filter(r => r.distance_km == null || r.distance_km <= r.delivery_radius_km)
        .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999)) as any;
    }
    return restaurants;
  },

  getRestaurant: async (id: string) => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Restaurant | null;
  },

  upsertRestaurant: async (payload: Partial<Restaurant> & { id: string }) => {
    const { error } = await supabase.from('restaurants').upsert(payload as any);
    if (error) throw error;
    return { success: true };
  },

  // ─── Menu ────────────────────────────────────────────────────
  listMenu: async (restaurantId: string) => {
    const [cats, items] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('display_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('display_order'),
    ]);
    if (cats.error) throw cats.error;
    if (items.error) throw items.error;
    return { categories: (cats.data || []) as MenuCategory[], items: (items.data || []) as MenuItem[] };
  },

  upsertMenuCategory: async (payload: Partial<MenuCategory> & { restaurant_id: string; name: string }) => {
    const { data, error } = await supabase.from('menu_categories').upsert(payload as any).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  deleteMenuCategory: async (id: string) => {
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) throw error;
  },

  upsertMenuItem: async (payload: Partial<MenuItem> & { restaurant_id: string; name: string; price: number }) => {
    const { data, error } = await supabase.from('menu_items').upsert(payload as any).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  deleteMenuItem: async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
  },

  toggleItemStock: async (id: string, in_stock: boolean) => {
    const { error } = await supabase.from('menu_items').update({ in_stock }).eq('id', id);
    if (error) throw error;
  },

  // ─── Orders ──────────────────────────────────────────────────
  placeOrder: async (payload: Partial<FoodOrder> & { id: string; customer_id: string; restaurant_id: string }) => {
    const { error } = await supabase.from('food_orders').insert(payload as any);
    if (error) throw error;
    return { success: true };
  },

  listMyOrders: async (customerId: string) => {
    const { data, error } = await supabase.from('food_orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as FoodOrder[];
  },

  listRestaurantOrders: async (restaurantId: string) => {
    const { data, error } = await supabase.from('food_orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as FoodOrder[];
  },

  updateOrderStatus: async (id: string, status: string, extra?: Partial<FoodOrder>) => {
    const stamps: any = {};
    if (status === 'accepted') stamps.accepted_at = new Date().toISOString();
    if (status === 'ready') stamps.ready_at = new Date().toISOString();
    if (status === 'picked_up') stamps.picked_up_at = new Date().toISOString();
    if (status === 'delivered') stamps.delivered_at = new Date().toISOString();
    const { error } = await supabase.from('food_orders').update({ status, ...stamps, ...(extra || {}) }).eq('id', id);
    if (error) throw error;
  },

  // ─── Riders ──────────────────────────────────────────────────
  upsertRider: async (payload: Partial<Rider> & { id: string; name: string; mobile: string; vehicle_type: string }) => {
    const { error } = await supabase.from('riders').upsert(payload as any);
    if (error) throw error;
  },

  setRiderOnline: async (riderId: string, online: boolean, coords?: { lat: number; lng: number }) => {
    const upd: any = { is_online: online };
    if (coords) { upd.current_lat = coords.lat; upd.current_lng = coords.lng; }
    const { error } = await supabase.from('riders').update(upd).eq('id', riderId);
    if (error) throw error;
  },

  pushLocation: async (riderId: string, orderId: string | null, lat: number, lng: number, heading?: number, speed?: number) => {
    const { error } = await supabase.from('rider_locations').insert({
      rider_id: riderId, order_id: orderId, latitude: lat, longitude: lng, heading, speed_kmph: speed,
    });
    if (error) throw error;
  },

  listRiders: async () => {
    const { data, error } = await supabase.from('riders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Rider[];
  },

  listRiderAssignments: async (riderId: string) => {
    const { data, error } = await supabase.from('rider_assignments').select('*, food_orders(*)').eq('rider_id', riderId).order('offered_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  respondToAssignment: async (id: string, accept: boolean, reason?: string) => {
    const { error } = await supabase.from('rider_assignments').update({
      status: accept ? 'accepted' : 'rejected',
      responded_at: new Date().toISOString(),
      rejection_reason: accept ? null : (reason || 'Rider rejected'),
    }).eq('id', id);
    if (error) throw error;
  },

  assignRider: async (orderId: string, riderId: string, payoutAmount: number, distanceKm: number) => {
    const { error } = await supabase.from('rider_assignments').insert({
      order_id: orderId, rider_id: riderId, payout_amount: payoutAmount, distance_km: distanceKm,
    });
    if (error) throw error;
  },

  latestRiderLocation: async (orderId: string) => {
    const { data, error } = await supabase.from('rider_locations')
      .select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },

  // ─── Reviews ─────────────────────────────────────────────────
  submitReview: async (payload: { order_id: string; customer_id: string; restaurant_id: string; rider_id?: string;
    food_rating?: number; restaurant_rating?: number; rider_rating?: number; comment?: string; }) => {
    const { error } = await supabase.from('food_reviews').upsert(payload as any, { onConflict: 'order_id' });
    if (error) throw error;
  },

  // ─── Combos ──────────────────────────────────────────────────
  listCombos: async (restaurantId: string) => {
    const { data, error } = await supabase.from('menu_combos' as any).select('*')
      .eq('restaurant_id', restaurantId).eq('is_active', true).order('display_order');
    if (error) throw error;
    return (data || []) as unknown as MenuCombo[];
  },

  upsertCombo: async (payload: Partial<MenuCombo> & { restaurant_id: string; name: string; combo_price: number }) => {
    const { data, error } = await supabase.from('menu_combos' as any).upsert(payload as any).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  deleteCombo: async (id: string) => {
    const { error } = await supabase.from('menu_combos' as any).delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Notify-when-available ───────────────────────────────────
  subscribeNotifyAvailable: async (menuItemId: string, customerId: string) => {
    const { error } = await supabase.from('menu_item_notify_requests' as any).upsert(
      { menu_item_id: menuItemId, customer_id: customerId } as any,
      { onConflict: 'menu_item_id,customer_id' }
    );
    if (error) throw error;
  },

  listMyNotifyRequests: async (customerId: string) => {
    const { data, error } = await supabase.from('menu_item_notify_requests' as any).select('menu_item_id')
      .eq('customer_id', customerId).is('notified_at', null);
    if (error) throw error;
    return ((data || []) as any[]).map(r => r.menu_item_id as string);
  },

  // ─── Bestseller refresh (admin) ──────────────────────────────
  refreshBestsellers: async () => {
    const { error } = await supabase.rpc('refresh_menu_item_order_counts' as any);
    if (error) throw error;
  },
};
