
-- ================================================
-- P4U Platform Database Schema
-- Migrated from legacy MySQL + mock data
-- ================================================

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== CITIES ==========
CREATE TABLE public.cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  area_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are publicly readable" ON public.cities FOR SELECT USING (true);

-- ========== AREAS ==========
CREATE TABLE public.areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Areas are publicly readable" ON public.areas FOR SELECT USING (true);

-- ========== OCCUPATIONS ==========
CREATE TABLE public.occupations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  customer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Occupations are publicly readable" ON public.occupations FOR SELECT USING (true);

-- ========== CATEGORIES (product categories) ==========
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);

-- ========== SERVICE CATEGORIES ==========
CREATE TABLE public.service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service categories are publicly readable" ON public.service_categories FOR SELECT USING (true);

-- ========== CUSTOMERS ==========
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  city_id TEXT REFERENCES public.cities(id),
  area_id TEXT REFERENCES public.areas(id),
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  wallet_points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL DEFAULT '',
  referred_by TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  occupation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers are publicly readable" ON public.customers FOR SELECT USING (true);

-- ========== VENDORS (product vendors) ==========
CREATE TABLE public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  city_id TEXT REFERENCES public.cities(id),
  area_id TEXT REFERENCES public.areas(id),
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  membership TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'level1_approved', 'level2_approved', 'verified', 'rejected')),
  rating NUMERIC DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors are publicly readable" ON public.vendors FOR SELECT USING (true);

-- ========== SERVICE VENDORS ==========
CREATE TABLE public.service_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  city_id TEXT REFERENCES public.cities(id),
  area_id TEXT REFERENCES public.areas(id),
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  membership TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'level1_approved', 'level2_approved', 'verified', 'rejected')),
  rating NUMERIC DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service vendors are publicly readable" ON public.service_vendors FOR SELECT USING (true);

-- ========== PRODUCTS ==========
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  max_points_redeemable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  vendor_name TEXT DEFAULT '',
  category_name TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  image TEXT DEFAULT '',
  rating NUMERIC DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== SERVICES ==========
CREATE TABLE public.services (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES public.service_vendors(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.service_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  max_points_redeemable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  vendor_name TEXT DEFAULT '',
  category_name TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  image TEXT DEFAULT '',
  rating NUMERIC DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  service_area TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are publicly readable" ON public.services FOR SELECT USING (true);

-- ========== ORDERS ==========
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id),
  vendor_id TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  points_used INTEGER NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'paid', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled')),
  customer_name TEXT DEFAULT '',
  vendor_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders are publicly readable" ON public.orders FOR SELECT USING (true);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== SETTLEMENTS ==========
CREATE TABLE public.settlements (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES public.orders(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'settled', 'on_hold')),
  settled_at TIMESTAMPTZ,
  vendor_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settlements are publicly readable" ON public.settlements FOR SELECT USING (true);

-- ========== CLASSIFIED ADS ==========
CREATE TABLE public.classified_ads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'sold')),
  user_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classified_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classifieds are publicly readable" ON public.classified_ads FOR SELECT USING (true);

-- ========== POINTS TRANSACTIONS ==========
CREATE TABLE public.points_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'referral', 'order_reward')),
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  user_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Points transactions are publicly readable" ON public.points_transactions FOR SELECT USING (true);

-- ========== REFERRALS ==========
CREATE TABLE public.referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  referrer_name TEXT DEFAULT '',
  referee_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrals are publicly readable" ON public.referrals FOR SELECT USING (true);

-- ========== BANNERS ==========
CREATE TABLE public.banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  desktop_image TEXT NOT NULL DEFAULT '',
  mobile_image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gradient TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners are publicly readable" ON public.banners FOR SELECT USING (true);

-- ========== PLATFORM VARIABLES ==========
CREATE TABLE public.platform_variables (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.platform_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform variables are publicly readable" ON public.platform_variables FOR SELECT USING (true);

-- ========== TAX CONFIG ==========
CREATE TABLE public.tax_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'GST' CHECK (type IN ('GST', 'Cess')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  applied_to TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tax config is publicly readable" ON public.tax_config FOR SELECT USING (true);

-- ========== POPUP BANNERS ==========
CREATE TABLE public.popup_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.popup_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Popup banners are publicly readable" ON public.popup_banners FOR SELECT USING (true);

-- ========== ADVERTISEMENTS ==========
CREATE TABLE public.advertisements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  advertiser TEXT NOT NULL DEFAULT '',
  placement TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'banner' CHECK (type IN ('banner', 'sidebar', 'sponsored', 'strip')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisements are publicly readable" ON public.advertisements FOR SELECT USING (true);

-- ========== WEBSITE QUERIES ==========
CREATE TABLE public.website_queries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.website_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Website queries are publicly readable" ON public.website_queries FOR SELECT USING (true);

-- ========== REPORT LOG ==========
CREATE TABLE public.report_log (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'processing')),
  file_size TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report log is publicly readable" ON public.report_log FOR SELECT USING (true);

-- ========== SUPPORT TICKETS ==========
CREATE TABLE public.support_tickets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to TEXT DEFAULT '',
  resolution_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support tickets are publicly readable" ON public.support_tickets FOR SELECT USING (true);
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== CLASSIFIED CATEGORIES ==========
CREATE TABLE public.classified_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.classified_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classified categories are publicly readable" ON public.classified_categories FOR SELECT USING (true);
