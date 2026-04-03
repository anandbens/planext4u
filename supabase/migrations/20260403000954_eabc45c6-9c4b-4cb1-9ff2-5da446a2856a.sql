-- Add plan payment fields to vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS plan_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS plan_transaction_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shop_photo_url text DEFAULT '';

-- Add payment mode to vendor_plans
ALTER TABLE public.vendor_plans
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'both';

-- Add shop photo to vendor_applications
ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS shop_photo_url text DEFAULT '';