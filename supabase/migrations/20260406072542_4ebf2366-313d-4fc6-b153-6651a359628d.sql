
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS youtube_video_url text DEFAULT '';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS background_image text DEFAULT '';
