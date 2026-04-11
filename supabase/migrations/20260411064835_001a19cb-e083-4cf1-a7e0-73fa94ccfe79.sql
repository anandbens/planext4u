
-- Add vendor-level max redemption override
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS max_redemption_percentage numeric DEFAULT NULL;

-- Add product-level commission override
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_override numeric DEFAULT NULL;

-- Add order-level tracking columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS effective_commission numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS effective_max_redemption numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_source text DEFAULT 'plan';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS redemption_source text DEFAULT 'plan';
