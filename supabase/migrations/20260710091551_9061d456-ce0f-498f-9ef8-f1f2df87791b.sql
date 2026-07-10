ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS mobile_video_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail_url text;