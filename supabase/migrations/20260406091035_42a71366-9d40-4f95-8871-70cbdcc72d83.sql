
-- Add multi-image support to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- Add product-level max redemption override
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_redemption_percentage numeric DEFAULT NULL;

-- Add multi-image support to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- Add category enhancements
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_emergency boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS is_emergency boolean DEFAULT false;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- Create Haversine distance function in PostgreSQL
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT 6371.0 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) *
      cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  )
$$;

-- Add indexes on vendor coordinates
CREATE INDEX IF NOT EXISTS idx_vendors_shop_lat ON public.vendors (shop_latitude);
CREATE INDEX IF NOT EXISTS idx_vendors_shop_lng ON public.vendors (shop_longitude);

-- Create social-videos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('social-videos', 'social-videos', true) ON CONFLICT (id) DO NOTHING;

-- Public read for social-videos
CREATE POLICY "Social videos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-videos');

-- Authenticated upload for social-videos
CREATE POLICY "Auth users can upload social videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-videos' AND auth.role() = 'authenticated');

-- Auth users can delete own social videos
CREATE POLICY "Auth users can delete social videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'social-videos' AND auth.role() = 'authenticated');
