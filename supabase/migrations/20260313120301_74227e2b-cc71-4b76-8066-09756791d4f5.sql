
CREATE TABLE public.vendor_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT '',
  account_holder TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  ifsc_code TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'savings',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Vendors can manage their own bank accounts
CREATE POLICY "Vendors can read own bank accounts"
  ON public.vendor_bank_accounts FOR SELECT
  TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can insert own bank accounts"
  ON public.vendor_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can update own bank accounts"
  ON public.vendor_bank_accounts FOR UPDATE
  TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can delete own bank accounts"
  ON public.vendor_bank_accounts FOR DELETE
  TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()));

-- Admins can manage all bank accounts
CREATE POLICY "Admins can manage vendor bank accounts"
  ON public.vendor_bank_accounts FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()));
