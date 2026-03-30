
-- Table for managing property amenities (admin-configurable)
CREATE TABLE IF NOT EXISTS public.property_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '',
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Amenities publicly readable" ON public.property_amenities FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage amenities" ON public.property_amenities FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Table for managing property filter options (property types, BHK, furnishing, facing etc)
CREATE TABLE IF NOT EXISTS public.property_filter_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type text NOT NULL, -- 'property_type', 'bhk', 'furnishing', 'facing', 'age', 'tenant_preference'
  label text NOT NULL,
  value text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.property_filter_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Filter options publicly readable" ON public.property_filter_options FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage filter options" ON public.property_filter_options FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Table for P4U Homes CMS content
CREATE TABLE IF NOT EXISTS public.homes_cms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'banner', 'faq', 'announcement', 'footer_link', 'seo_meta', 'page_content'
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.homes_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CMS publicly readable" ON public.homes_cms FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage CMS" ON public.homes_cms FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Add avg_rent and avg_sale_price to property_localities
ALTER TABLE public.property_localities ADD COLUMN IF NOT EXISTS avg_rent numeric DEFAULT 0;
ALTER TABLE public.property_localities ADD COLUMN IF NOT EXISTS avg_sale_price numeric DEFAULT 0;
ALTER TABLE public.property_localities ADD COLUMN IF NOT EXISTS life_score jsonb DEFAULT '{"connectivity":0,"safety":0,"amenities":0,"air_quality":0,"water":0,"power":0}';
ALTER TABLE public.property_localities ADD COLUMN IF NOT EXISTS seo_title text DEFAULT '';
ALTER TABLE public.property_localities ADD COLUMN IF NOT EXISTS seo_description text DEFAULT '';

-- Add plan_type to property_plans for owner vs seeker plans
ALTER TABLE public.property_plans ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'owner';
ALTER TABLE public.property_plans ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]';
