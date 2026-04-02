
-- 1. Create vendor-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-assets', 'vendor-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read vendor-assets" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-assets');
CREATE POLICY "Auth upload vendor-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update vendor-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'vendor-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete vendor-assets" ON storage.objects FOR DELETE USING (bucket_id = 'vendor-assets' AND auth.role() = 'authenticated');

-- 2. Create vendor_plans table
CREATE TABLE IF NOT EXISTS public.vendor_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL,
  plan_type text NOT NULL DEFAULT 'local',
  price numeric NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 30,
  visibility_type text NOT NULL DEFAULT 'radius_based',
  radius_km numeric NOT NULL DEFAULT 5,
  commission_percentage numeric NOT NULL DEFAULT 10,
  max_redemption_percentage numeric NOT NULL DEFAULT 5,
  banner_ads boolean NOT NULL DEFAULT false,
  video_ads boolean NOT NULL DEFAULT false,
  priority_listing boolean NOT NULL DEFAULT false,
  plan_tier integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vendor_plans" ON public.vendor_plans FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendor plans publicly readable" ON public.vendor_plans FOR SELECT TO public USING (true);

CREATE TRIGGER update_vendor_plans_updated_at BEFORE UPDATE ON public.vendor_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add geo-location and plan columns to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS shop_latitude double precision DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS shop_longitude double precision DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS shop_address text DEFAULT '';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.vendor_plans(id) ON DELETE SET NULL;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS plan_start_date timestamptz;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS plan_end_date timestamptz;

-- 4. Add geo-location to vendor_applications
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 0;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 0;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS shop_address text DEFAULT '';

-- 5. Seed default plans
INSERT INTO public.vendor_plans (plan_name, plan_type, price, validity_days, visibility_type, radius_km, commission_percentage, max_redemption_percentage, banner_ads, video_ads, priority_listing, plan_tier, description) VALUES
  ('Basic', 'local', 0, 30, 'radius_based', 2, 15, 3, false, false, false, 1, 'Free local listing within 2km radius'),
  ('Standard', 'local', 999, 30, 'radius_based', 5, 12, 5, false, false, false, 2, 'Extended 5km reach with lower commission'),
  ('Premium', 'local', 2499, 30, 'city', 10, 10, 8, true, false, true, 3, 'City-wide visibility with banner ads'),
  ('Bronze', 'vip', 9999, 90, 'city', 15, 8, 10, true, false, true, 4, 'VIP city presence with priority listing'),
  ('Silver', 'vip', 24999, 180, 'state', 25, 7, 12, true, true, true, 5, 'State-wide visibility with all promotions'),
  ('Gold', 'vip', 49999, 365, 'state', 50, 6, 15, true, true, true, 6, 'Premium state coverage for 1 year'),
  ('Diamond', 'vip', 99999, 365, 'pan_india', 0, 5, 18, true, true, true, 7, 'PAN India visibility - top tier'),
  ('Platinum', 'vip', 199999, 365, 'pan_india', 0, 4, 20, true, true, true, 8, 'Ultimate plan with maximum benefits');
