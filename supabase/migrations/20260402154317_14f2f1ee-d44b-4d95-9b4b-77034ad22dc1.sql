-- Add unique constraint on customers.mobile
ALTER TABLE public.customers ADD CONSTRAINT customers_mobile_unique UNIQUE (mobile);
