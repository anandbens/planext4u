-- Add category-level commission configuration
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS promotion_banner_url text DEFAULT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS promotion_title text DEFAULT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS promotion_active boolean DEFAULT false;

ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT NULL;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS promotion_banner_url text DEFAULT NULL;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS promotion_title text DEFAULT NULL;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS promotion_active boolean DEFAULT false;

-- Store vendor registration category selections
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS selected_categories jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS selected_subcategories jsonb DEFAULT '[]'::jsonb;