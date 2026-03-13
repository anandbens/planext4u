
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'finance', 'sales', 'vendor', 'customer');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  mobile TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  vendor_id TEXT DEFAULT NULL,
  customer_id TEXT DEFAULT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. is_admin_user function (admin, finance, or sales)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'finance', 'sales')
  )
$$;

-- 6. get_vendor_id function
CREATE OR REPLACE FUNCTION public.get_vendor_id(_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT vendor_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'vendor'
  LIMIT 1
$$;

-- 7. get_customer_id function
CREATE OR REPLACE FUNCTION public.get_customer_id(_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT customer_id FROM public.user_roles
  WHERE user_id = _user_id AND role = 'customer'
  LIMIT 1
$$;

-- 8. get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 9. Profiles RLS policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- 10. User roles RLS policies
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATE RLS ON ALL EXISTING TABLES ============

-- PRODUCTS: keep public read, add admin + vendor CRUD
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors can insert own products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));
CREATE POLICY "Vendors can update own products" ON public.products
  FOR UPDATE TO authenticated USING (vendor_id = public.get_vendor_id(auth.uid()));
CREATE POLICY "Vendors can delete own products" ON public.products
  FOR DELETE TO authenticated USING (vendor_id = public.get_vendor_id(auth.uid()));

-- SERVICES: keep public read, add admin + vendor CRUD
CREATE POLICY "Admins can insert services" ON public.services
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update services" ON public.services
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete services" ON public.services
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors can insert own services" ON public.services
  FOR INSERT TO authenticated WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));
CREATE POLICY "Vendors can update own services" ON public.services
  FOR UPDATE TO authenticated USING (vendor_id = public.get_vendor_id(auth.uid()));
CREATE POLICY "Vendors can delete own services" ON public.services
  FOR DELETE TO authenticated USING (vendor_id = public.get_vendor_id(auth.uid()));

-- ORDERS: public read stays for now, add admin CRUD, customer can see own, vendor can see own
CREATE POLICY "Admins can insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Customers can insert own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

-- CUSTOMERS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- VENDORS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert vendors" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update vendors" ON public.vendors
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete vendors" ON public.vendors
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Vendors can update own profile" ON public.vendors
  FOR UPDATE TO authenticated USING (id = public.get_vendor_id(auth.uid()));

-- SERVICE_VENDORS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert service_vendors" ON public.service_vendors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update service_vendors" ON public.service_vendors
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete service_vendors" ON public.service_vendors
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- SETTLEMENTS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert settlements" ON public.settlements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update settlements" ON public.settlements
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete settlements" ON public.settlements
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- CATEGORIES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- SERVICE_CATEGORIES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert service_categories" ON public.service_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update service_categories" ON public.service_categories
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete service_categories" ON public.service_categories
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- BANNERS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert banners" ON public.banners
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update banners" ON public.banners
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete banners" ON public.banners
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- POPUP_BANNERS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert popup_banners" ON public.popup_banners
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update popup_banners" ON public.popup_banners
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete popup_banners" ON public.popup_banners
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- ADVERTISEMENTS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert advertisements" ON public.advertisements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update advertisements" ON public.advertisements
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete advertisements" ON public.advertisements
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- CLASSIFIED_ADS: keep public read, add admin CRUD + customer own
CREATE POLICY "Admins can insert classified_ads" ON public.classified_ads
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update classified_ads" ON public.classified_ads
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete classified_ads" ON public.classified_ads
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Customers can insert own classifieds" ON public.classified_ads
  FOR INSERT TO authenticated WITH CHECK (user_id = public.get_customer_id(auth.uid()));

-- CLASSIFIED_CATEGORIES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert classified_categories" ON public.classified_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update classified_categories" ON public.classified_categories
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete classified_categories" ON public.classified_categories
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- OCCUPATIONS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert occupations" ON public.occupations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update occupations" ON public.occupations
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete occupations" ON public.occupations
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- CITIES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert cities" ON public.cities
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update cities" ON public.cities
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete cities" ON public.cities
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- AREAS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert areas" ON public.areas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update areas" ON public.areas
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete areas" ON public.areas
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- TAX_CONFIG: keep public read, add admin CRUD
CREATE POLICY "Admins can insert tax_config" ON public.tax_config
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update tax_config" ON public.tax_config
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete tax_config" ON public.tax_config
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- PLATFORM_VARIABLES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert platform_variables" ON public.platform_variables
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update platform_variables" ON public.platform_variables
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete platform_variables" ON public.platform_variables
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- POINTS_TRANSACTIONS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert points_transactions" ON public.points_transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update points_transactions" ON public.points_transactions
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete points_transactions" ON public.points_transactions
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- REFERRALS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert referrals" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update referrals" ON public.referrals
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete referrals" ON public.referrals
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- REPORT_LOG: keep public read, add admin CRUD
CREATE POLICY "Admins can insert report_log" ON public.report_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update report_log" ON public.report_log
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete report_log" ON public.report_log
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- SUPPORT_TICKETS: keep public read, add admin CRUD
CREATE POLICY "Admins can insert support_tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update support_tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete support_tickets" ON public.support_tickets
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));

-- WEBSITE_QUERIES: keep public read, add admin CRUD
CREATE POLICY "Admins can insert website_queries" ON public.website_queries
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can update website_queries" ON public.website_queries
  FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can delete website_queries" ON public.website_queries
  FOR DELETE TO authenticated USING (public.is_admin_user(auth.uid()));
