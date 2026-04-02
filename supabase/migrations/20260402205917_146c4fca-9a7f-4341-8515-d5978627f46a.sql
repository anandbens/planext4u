ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Male';