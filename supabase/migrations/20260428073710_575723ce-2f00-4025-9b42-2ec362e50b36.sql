ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_social_posts_category ON public.social_posts (category) WHERE category IS NOT NULL;