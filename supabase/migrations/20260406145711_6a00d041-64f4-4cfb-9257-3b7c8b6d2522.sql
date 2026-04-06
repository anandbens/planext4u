
-- Add cooling period and expiry fields to referrals
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS cooling_until timestamptz,
ADD COLUMN IF NOT EXISTS first_order_placed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bonus_credited boolean NOT NULL DEFAULT false;

-- Add expiry to points_transactions
ALTER TABLE public.points_transactions
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS is_expired boolean NOT NULL DEFAULT false;
