-- Add vendor_category column to vendors, service_vendors, and vendor_applications
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS vendor_category text NOT NULL DEFAULT 'product'
  CHECK (vendor_category IN ('product', 'service'));

ALTER TABLE public.service_vendors
  ADD COLUMN IF NOT EXISTS vendor_category text NOT NULL DEFAULT 'service'
  CHECK (vendor_category IN ('product', 'service'));

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS vendor_category text NOT NULL DEFAULT 'product'
  CHECK (vendor_category IN ('product', 'service'));

-- Backfill: ensure existing rows are correctly categorized
UPDATE public.vendors SET vendor_category = 'product' WHERE vendor_category IS NULL OR vendor_category NOT IN ('product','service');
UPDATE public.service_vendors SET vendor_category = 'service' WHERE vendor_category IS NULL OR vendor_category NOT IN ('product','service');

CREATE INDEX IF NOT EXISTS idx_vendors_vendor_category ON public.vendors(vendor_category);
CREATE INDEX IF NOT EXISTS idx_service_vendors_vendor_category ON public.service_vendors(vendor_category);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_vendor_category ON public.vendor_applications(vendor_category);