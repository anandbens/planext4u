-- Add India GST / HSN columns for tax compliance reporting

-- Products: HSN/SAC code + GST rate (defaults: products 18%, services 18%)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS sac_code TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS uqc TEXT DEFAULT 'NOS';

-- Vendors: GSTIN + state-of-origin (place of supply for GST)
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS state_name TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT;

-- Service vendors: same fields
ALTER TABLE public.service_vendors
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS state_name TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT;

-- Orders: capture place-of-supply + tax breakup snapshot at invoice time
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS place_of_supply_state TEXT,
  ADD COLUMN IF NOT EXISTS place_of_supply_code TEXT,
  ADD COLUMN IF NOT EXISTS vendor_gstin TEXT,
  ADD COLUMN IF NOT EXISTS vendor_state TEXT,
  ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tcs_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_no TEXT;

-- Index for fast monthly/FY filtering
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON public.orders (created_at, status);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_created ON public.orders (vendor_id, created_at);

-- Backfill defaults: split existing tax 50/50 CGST/SGST (intra-state assumed) and set taxable_value=subtotal
UPDATE public.orders
SET cgst_amount = ROUND(COALESCE(tax,0)/2.0, 2),
    sgst_amount = ROUND(COALESCE(tax,0)/2.0, 2),
    igst_amount = 0,
    taxable_value = COALESCE(subtotal, 0),
    is_interstate = FALSE
WHERE cgst_amount IS NULL OR (cgst_amount = 0 AND sgst_amount = 0 AND COALESCE(tax,0) > 0);
