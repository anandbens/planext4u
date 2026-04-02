ALTER TABLE public.customer_addresses
ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 0,
ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 0;