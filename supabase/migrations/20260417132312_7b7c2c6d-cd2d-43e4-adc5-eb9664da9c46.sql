
-- ─────────────────────────────────────────────────────────────────────
-- FOOD DELIVERY — FOUNDATION SCHEMA
-- ─────────────────────────────────────────────────────────────────────

-- 1. Restaurants (extends vendors with food-specific fields)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id text PRIMARY KEY,
  vendor_id text REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  tagline text,
  description text,
  cuisine text[] DEFAULT '{}',
  veg_only boolean NOT NULL DEFAULT false,
  cover_image text,
  logo_url text,
  fssai_license text,
  fssai_expiry date,
  address text NOT NULL,
  city_id text REFERENCES public.cities(id),
  area_id text REFERENCES public.areas(id),
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  opening_time time,
  closing_time time,
  open_days int[] DEFAULT '{0,1,2,3,4,5,6}',
  avg_prep_minutes int NOT NULL DEFAULT 25,
  delivery_radius_km numeric NOT NULL DEFAULT 5,
  packaging_fee numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 18,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','busy','offline')),
  is_active boolean NOT NULL DEFAULT true,
  rating numeric NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Menu categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Menu items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  discounted_price numeric,
  is_veg boolean NOT NULL DEFAULT true,
  spice_level text CHECK (spice_level IN ('mild','medium','spicy','extra_spicy')),
  image_url text,
  addons jsonb DEFAULT '[]'::jsonb,
  customizations jsonb DEFAULT '[]'::jsonb,
  serves int DEFAULT 1,
  prep_minutes int DEFAULT 15,
  gst_rate numeric NOT NULL DEFAULT 5,
  in_stock boolean NOT NULL DEFAULT true,
  is_bestseller boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Food orders
CREATE TABLE IF NOT EXISTS public.food_orders (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name text,
  customer_phone text,
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  restaurant_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  packaging_fee numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  rider_tip numeric NOT NULL DEFAULT 0,
  gst numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  points_used int NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  rider_payout numeric NOT NULL DEFAULT 0,
  restaurant_payout numeric NOT NULL DEFAULT 0,
  p4u_cut numeric NOT NULL DEFAULT 0,
  delivery_address text NOT NULL,
  delivery_lat double precision,
  delivery_lng double precision,
  distance_km numeric,
  eta_minutes int,
  handover_otp text,
  payment_method text NOT NULL DEFAULT 'online',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'placed' CHECK (status IN
    ('placed','accepted','preparing','ready','assigned','picked_up','on_the_way','delivered','cancelled','rejected')),
  cancellation_reason text,
  customer_notes text,
  placed_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_orders_customer ON public.food_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_restaurant ON public.food_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON public.food_orders(status);

-- 5. Status history
CREATE TABLE IF NOT EXISTS public.food_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Riders
CREATE TABLE IF NOT EXISTS public.riders (
  id text PRIMARY KEY,
  user_id uuid UNIQUE,
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text,
  profile_photo text,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('bike','scooter','bicycle','car')),
  vehicle_number text,
  license_number text,
  license_image_url text,
  aadhaar_number text,
  aadhaar_image_url text,
  pan_number text,
  pan_image_url text,
  bank_account_number text,
  bank_ifsc text,
  bank_holder_name text,
  city_id text REFERENCES public.cities(id),
  area_id text REFERENCES public.areas(id),
  base_location_lat double precision,
  base_location_lng double precision,
  current_lat double precision,
  current_lng double precision,
  is_online boolean NOT NULL DEFAULT false,
  shift_start time,
  shift_end time,
  kyc_status text NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
  rating numeric NOT NULL DEFAULT 0,
  total_deliveries int NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Rider live locations (realtime)
CREATE TABLE IF NOT EXISTS public.rider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id text NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id text REFERENCES public.food_orders(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading numeric,
  speed_kmph numeric,
  accuracy_m numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_time ON public.rider_locations(rider_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rider_locations_order ON public.rider_locations(order_id);

-- 8. Rider assignments
CREATE TABLE IF NOT EXISTS public.rider_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  rider_id text NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','rejected','expired','completed','cancelled')),
  payout_amount numeric NOT NULL DEFAULT 0,
  distance_km numeric,
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  rejection_reason text,
  UNIQUE(order_id, rider_id)
);

-- 9. Food reviews (food + restaurant + rider)
CREATE TABLE IF NOT EXISTS public.food_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rider_id text REFERENCES public.riders(id) ON DELETE SET NULL,
  food_rating int CHECK (food_rating BETWEEN 1 AND 5),
  restaurant_rating int CHECK (restaurant_rating BETWEEN 1 AND 5),
  rider_rating int CHECK (rider_rating BETWEEN 1 AND 5),
  comment text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','flagged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Triggers: updated_at
-- ─────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_food_orders_updated_at BEFORE UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_riders_updated_at BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status history auto-log
CREATE OR REPLACE FUNCTION public.log_food_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.food_order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_food_order_status_log AFTER UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_food_order_status_change();

-- ─────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.food_orders REPLICA IDENTITY FULL;
ALTER TABLE public.rider_locations REPLICA IDENTITY FULL;
ALTER TABLE public.rider_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_assignments;

-- ─────────────────────────────────────────────────────────────────────
-- Rider role on user_roles enum (add if missing)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rider' AND enumtypid = (SELECT oid FROM pg_type WHERE typname='app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'rider';
  END IF;
END $$;

-- Helper: get rider id for a user
CREATE OR REPLACE FUNCTION public.get_rider_id(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.riders WHERE user_id = _user_id LIMIT 1
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_reviews ENABLE ROW LEVEL SECURITY;

-- Restaurants: public read for active, vendor manages own, admin all
CREATE POLICY "Public reads active restaurants" ON public.restaurants FOR SELECT USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Vendor manages own restaurant" ON public.restaurants FOR ALL
  USING (vendor_id = public.get_vendor_id(auth.uid())) WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));
CREATE POLICY "Admins manage all restaurants" ON public.restaurants FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Menu categories
CREATE POLICY "Public reads menu categories" ON public.menu_categories FOR SELECT USING (is_active = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Restaurant manages own categories" ON public.menu_categories FOR ALL
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())));
CREATE POLICY "Admins manage all menu categories" ON public.menu_categories FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Menu items
CREATE POLICY "Public reads menu items" ON public.menu_items FOR SELECT USING (in_stock = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "Restaurant manages own items" ON public.menu_items FOR ALL
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())));
CREATE POLICY "Admins manage all menu items" ON public.menu_items FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Food orders
CREATE POLICY "Customers see their food orders" ON public.food_orders FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));
CREATE POLICY "Customers create their food orders" ON public.food_orders FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));
CREATE POLICY "Customers update own food orders (cancel)" ON public.food_orders FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid())) WITH CHECK (customer_id = public.get_customer_id(auth.uid()));
CREATE POLICY "Restaurant sees its food orders" ON public.food_orders FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())));
CREATE POLICY "Restaurant updates its food orders" ON public.food_orders FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())));
CREATE POLICY "Rider sees assigned food orders" ON public.food_orders FOR SELECT
  USING (id IN (SELECT order_id FROM public.rider_assignments WHERE rider_id = public.get_rider_id(auth.uid())));
CREATE POLICY "Rider updates assigned food orders" ON public.food_orders FOR UPDATE
  USING (id IN (SELECT order_id FROM public.rider_assignments WHERE rider_id = public.get_rider_id(auth.uid()) AND status = 'accepted'))
  WITH CHECK (id IN (SELECT order_id FROM public.rider_assignments WHERE rider_id = public.get_rider_id(auth.uid())));
CREATE POLICY "Admins manage all food orders" ON public.food_orders FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Status history
CREATE POLICY "Order parties see status history" ON public.food_order_status_history FOR SELECT
  USING (
    public.is_admin_user(auth.uid())
    OR order_id IN (SELECT id FROM public.food_orders WHERE customer_id = public.get_customer_id(auth.uid()))
    OR order_id IN (SELECT fo.id FROM public.food_orders fo WHERE fo.restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())))
    OR order_id IN (SELECT order_id FROM public.rider_assignments WHERE rider_id = public.get_rider_id(auth.uid()))
  );

-- Riders
CREATE POLICY "Riders see own profile" ON public.riders FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));
CREATE POLICY "Riders update own profile" ON public.riders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage riders" ON public.riders FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Rider locations
CREATE POLICY "Rider writes own location" ON public.rider_locations FOR INSERT
  WITH CHECK (rider_id = public.get_rider_id(auth.uid()));
CREATE POLICY "Customer of order reads rider location" ON public.rider_locations FOR SELECT
  USING (
    public.is_admin_user(auth.uid())
    OR rider_id = public.get_rider_id(auth.uid())
    OR order_id IN (SELECT id FROM public.food_orders WHERE customer_id = public.get_customer_id(auth.uid()))
    OR order_id IN (SELECT fo.id FROM public.food_orders fo WHERE fo.restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid())))
  );

-- Rider assignments
CREATE POLICY "Rider sees own assignments" ON public.rider_assignments FOR SELECT
  USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));
CREATE POLICY "Rider responds to assignment" ON public.rider_assignments FOR UPDATE
  USING (rider_id = public.get_rider_id(auth.uid())) WITH CHECK (rider_id = public.get_rider_id(auth.uid()));
CREATE POLICY "Restaurant sees assignments for its orders" ON public.rider_assignments FOR SELECT
  USING (order_id IN (SELECT fo.id FROM public.food_orders fo WHERE fo.restaurant_id IN (SELECT id FROM public.restaurants WHERE vendor_id = public.get_vendor_id(auth.uid()))));
CREATE POLICY "Customer sees assignment for own order" ON public.rider_assignments FOR SELECT
  USING (order_id IN (SELECT id FROM public.food_orders WHERE customer_id = public.get_customer_id(auth.uid())));
CREATE POLICY "Admins manage assignments" ON public.rider_assignments FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- Food reviews
CREATE POLICY "Public reads active food reviews" ON public.food_reviews FOR SELECT
  USING (status = 'active' OR public.is_admin_user(auth.uid()));
CREATE POLICY "Customer creates own review" ON public.food_reviews FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid())
    AND order_id IN (SELECT id FROM public.food_orders WHERE customer_id = public.get_customer_id(auth.uid()) AND status = 'delivered'));
CREATE POLICY "Customer updates own review" ON public.food_reviews FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid())) WITH CHECK (customer_id = public.get_customer_id(auth.uid()));
CREATE POLICY "Admins manage food reviews" ON public.food_reviews FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
