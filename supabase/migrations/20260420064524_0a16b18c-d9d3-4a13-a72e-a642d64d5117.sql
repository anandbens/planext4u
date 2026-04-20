ALTER TABLE public.categories ALTER COLUMN image DROP NOT NULL;
ALTER TABLE public.banners ALTER COLUMN desktop_image DROP NOT NULL;
ALTER TABLE public.banners ALTER COLUMN mobile_image DROP NOT NULL;