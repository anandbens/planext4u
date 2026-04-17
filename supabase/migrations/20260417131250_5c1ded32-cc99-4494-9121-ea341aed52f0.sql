
-- Add referred_by column to vendor_applications and vendors so vendor referral works
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.service_vendors ADD COLUMN IF NOT EXISTS referred_by text;

-- When a vendor application is converted/promoted into the vendors table,
-- propagate the referred_by code so it is preserved on the vendor record.
-- (We rely on the admin/automation flow to copy referred_by; the column now exists.)
