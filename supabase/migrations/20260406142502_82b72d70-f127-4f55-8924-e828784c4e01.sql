
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_on_platform_fee NUMERIC DEFAULT 0;
