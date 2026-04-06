-- Add missing legacy product config fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_hours integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promise_p4u text DEFAULT '',
  ADD COLUMN IF NOT EXISTS helpline_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS subcategory_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subcategory_name text DEFAULT '';