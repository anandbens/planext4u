
-- Product Attributes master table
CREATE TABLE public.product_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  attribute_type TEXT NOT NULL DEFAULT 'select',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attributes publicly readable" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Admins manage attributes" ON public.product_attributes FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Attribute values
CREATE TABLE public.product_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attr values publicly readable" ON public.product_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins manage attr values" ON public.product_attribute_values FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Tax slabs
CREATE TABLE public.tax_slabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tax slabs publicly readable" ON public.tax_slabs FOR SELECT USING (true);
CREATE POLICY "Admins manage tax slabs" ON public.tax_slabs FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Add columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS long_description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inactivation_reason TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_attributes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_slab_id UUID REFERENCES public.tax_slabs(id);

-- Add vendor_id to media_library
ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS vendor_id TEXT DEFAULT NULL;

-- RLS for vendors on media_library
CREATE POLICY "Vendors manage own media" ON public.media_library FOR ALL TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = get_vendor_id(auth.uid()));

-- Seed tax slabs
INSERT INTO public.tax_slabs (name, rate) VALUES
  ('GST 0%', 0),
  ('GST 5%', 5),
  ('GST 12%', 12),
  ('GST 18%', 18),
  ('GST 28%', 28);
