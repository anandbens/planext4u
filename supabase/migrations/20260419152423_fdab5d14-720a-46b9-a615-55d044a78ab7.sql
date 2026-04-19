ALTER TABLE public.service_vendors
  ADD COLUMN IF NOT EXISTS background_image text,
  ADD COLUMN IF NOT EXISTS shop_address text,
  ADD COLUMN IF NOT EXISTS shop_latitude double precision,
  ADD COLUMN IF NOT EXISTS shop_longitude double precision,
  ADD COLUMN IF NOT EXISTS plan_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS plan_end_date timestamptz;