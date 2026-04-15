ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS transaction_reference text;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS rejection_reason text;