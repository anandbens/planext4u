-- Add shipping and POD columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS courier_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tracking_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tracking_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pod_confirmed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pod_confirmed_at timestamptz DEFAULT NULL;