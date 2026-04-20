ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_mobile_unique;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_unique;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_mobile_unique;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_email_unique;