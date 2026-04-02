
-- KYC documents table
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  document_type text NOT NULL DEFAULT 'aadhaar',
  document_number text NOT NULL DEFAULT '',
  front_image_url text DEFAULT '',
  back_image_url text DEFAULT '',
  status text NOT NULL DEFAULT 'not_submitted',
  rejection_reason text DEFAULT '',
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC docs" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Users can insert own KYC docs" ON public.kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Users can update own KYC docs" ON public.kyc_documents
  FOR UPDATE TO authenticated
  USING (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Admins manage all KYC docs" ON public.kyc_documents
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor applications table
CREATE TABLE public.vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  secondary_phone text DEFAULT '',
  email text NOT NULL DEFAULT '',
  state text DEFAULT '',
  city text DEFAULT '',
  fb_link text DEFAULT '',
  instagram_link text DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  business_type text DEFAULT 'proprietorship',
  store_name text DEFAULT '',
  store_logo_url text DEFAULT '',
  category text DEFAULT 'product',
  subcategory text DEFAULT '',
  business_description text DEFAULT '',
  gst_number text DEFAULT '',
  gst_certificate_url text DEFAULT '',
  fssai_url text DEFAULT '',
  pan_number text DEFAULT '',
  pan_image_url text DEFAULT '',
  aadhaar_number text DEFAULT '',
  aadhaar_front_url text DEFAULT '',
  aadhaar_back_url text DEFAULT '',
  bank_account_number text DEFAULT '',
  bank_ifsc text DEFAULT '',
  bank_holder_name text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  rejection_reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vendor apps" ON public.vendor_applications
  FOR SELECT TO authenticated
  USING (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Users can insert own vendor apps" ON public.vendor_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Users can update own vendor apps" ON public.vendor_applications
  FOR UPDATE TO authenticated
  USING (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Admins manage all vendor apps" ON public.vendor_applications
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_vendor_applications_updated_at
  BEFORE UPDATE ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KYC storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own KYC docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own KYC docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all KYC docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND is_admin_user(auth.uid()));

-- Add about and profile_photo to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS about text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_photo text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_started';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_completeness integer DEFAULT 0;
