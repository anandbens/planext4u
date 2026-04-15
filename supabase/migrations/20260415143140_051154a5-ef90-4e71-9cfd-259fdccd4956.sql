
-- Add replacement_time column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS replacement_time text DEFAULT '12 Hours';
