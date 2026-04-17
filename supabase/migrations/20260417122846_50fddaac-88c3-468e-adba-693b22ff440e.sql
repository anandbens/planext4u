-- Add sold counter to products for tracking sales
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;

-- Allow vendors to manage their own KYC documents (mirror customer policies)
DROP POLICY IF EXISTS "Vendors can view own KYC docs" ON public.kyc_documents;
DROP POLICY IF EXISTS "Vendors can insert own KYC docs" ON public.kyc_documents;
DROP POLICY IF EXISTS "Vendors can update own KYC docs" ON public.kyc_documents;

CREATE POLICY "Vendors can view own KYC docs"
ON public.kyc_documents FOR SELECT
USING (user_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can insert own KYC docs"
ON public.kyc_documents FOR INSERT
WITH CHECK (user_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can update own KYC docs"
ON public.kyc_documents FOR UPDATE
USING (user_id = public.get_vendor_id(auth.uid()));

-- Add kyc_status to vendors table to mirror customer behavior
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_submitted';