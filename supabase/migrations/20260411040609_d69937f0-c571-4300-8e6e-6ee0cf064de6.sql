
ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS mobile_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS link_target_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS link_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS placements text[] DEFAULT ARRAY['all']::text[],
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';
