ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS customer_pod_confirmed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_pod_confirmed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_pod_photo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vendor_completion_confirmed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vendor_completion_confirmed_at timestamptz DEFAULT NULL;