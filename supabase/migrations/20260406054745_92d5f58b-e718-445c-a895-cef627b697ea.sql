ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_rating smallint,
  ADD COLUMN IF NOT EXISTS rating_comment text,
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;