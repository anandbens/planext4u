ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS theme_accent text;