
-- Add product_type enum-like column and SEO/inventory fields to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS manage_stock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dimensions jsonb DEFAULT '{}';

-- Unique slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL AND slug != '';

-- Add hex_color and display_label to attribute values
ALTER TABLE public.product_attribute_values
  ADD COLUMN IF NOT EXISTS hex_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_label text DEFAULT '';

-- Product Variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  stock_status text NOT NULL DEFAULT 'in_stock',
  weight numeric DEFAULT 0,
  dimensions jsonb DEFAULT '{}',
  variant_attributes jsonb NOT NULL DEFAULT '{}',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique variant combinations per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_attrs_unique 
  ON public.product_variants(product_id, variant_attributes);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_sku ON public.product_variants(sku) WHERE sku IS NOT NULL AND sku != '';

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants publicly readable" ON public.product_variants FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendors manage own variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())));

-- Variant Images table
CREATE TABLE IF NOT EXISTS public.product_variant_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variant_images_variant ON public.product_variant_images(variant_id);

ALTER TABLE public.product_variant_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variant images publicly readable" ON public.product_variant_images FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage variant images" ON public.product_variant_images FOR ALL TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendors manage own variant images" ON public.product_variant_images FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_variants pv 
    JOIN public.products p ON p.id = pv.product_id 
    WHERE pv.id = variant_id AND p.vendor_id = get_vendor_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_variants pv 
    JOIN public.products p ON p.id = pv.product_id 
    WHERE pv.id = variant_id AND p.vendor_id = get_vendor_id(auth.uid())
  ));

-- Product Attribute Map (which attributes apply to which product)
CREATE TABLE IF NOT EXISTS public.product_attribute_map (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_attr_map_product ON public.product_attribute_map(product_id);

ALTER TABLE public.product_attribute_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attr map publicly readable" ON public.product_attribute_map FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage attr map" ON public.product_attribute_map FOR ALL TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendors manage own attr map" ON public.product_attribute_map FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())));

-- Inventory Log
CREATE TABLE IF NOT EXISTS public.inventory_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  change_qty integer NOT NULL DEFAULT 0,
  previous_qty integer DEFAULT 0,
  new_qty integer DEFAULT 0,
  reason text DEFAULT '',
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_log_product ON public.inventory_log(product_id);

ALTER TABLE public.inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read inventory log" ON public.inventory_log FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));
CREATE POLICY "Admins insert inventory log" ON public.inventory_log FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendors read own inventory log" ON public.inventory_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())));
CREATE POLICY "Vendors insert own inventory log" ON public.inventory_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = get_vendor_id(auth.uid())));

-- Trigger for updated_at on product_variants
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing products to have product_type = 'simple' and generate slugs
UPDATE public.products SET product_type = 'simple' WHERE product_type IS NULL OR product_type = '';
UPDATE public.products SET slug = lower(replace(replace(replace(title, ' ', '-'), '''', ''), '"', '')) || '-' || substring(id from 1 for 6) WHERE slug IS NULL OR slug = '';
