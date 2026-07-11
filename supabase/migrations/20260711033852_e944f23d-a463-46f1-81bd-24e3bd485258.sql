
DO $$ BEGIN CREATE TYPE public.franchise_coverage_type AS ENUM ('radius','city','district','state'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.franchise_plan_status AS ENUM ('active','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.franchise_registration_status AS ENUM ('draft','pending','approved','rejected','converted','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.active_franchise_status AS ENUM ('active','suspended','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_entity_type AS ENUM ('vendor','franchise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status_type AS ENUM ('paid','pending','partial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_mode_type AS ENUM ('upi','bank_transfer','neft','rtgs','cash','cheque'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.franchise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  investment_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  security_deposit NUMERIC(14,2) DEFAULT 0,
  delivery_radius_km NUMERIC(10,2) DEFAULT 0,
  coverage_type public.franchise_coverage_type NOT NULL DEFAULT 'radius',
  validity_months INTEGER NOT NULL DEFAULT 12,
  description TEXT,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  commission_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.franchise_plan_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_plans TO authenticated;
GRANT ALL ON public.franchise_plans TO service_role;
GRANT SELECT ON public.franchise_plans TO anon;
ALTER TABLE public.franchise_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select_active_or_admin" ON public.franchise_plans FOR SELECT USING (status = 'active' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fp_admin_insert" ON public.franchise_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fp_admin_update" ON public.franchise_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fp_admin_delete" ON public.franchise_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_franchise_plans_updated_at BEFORE UPDATE ON public.franchise_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.receipt_sequences (
  scope TEXT NOT NULL, year INTEGER NOT NULL, last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (scope, year)
);
GRANT SELECT ON public.receipt_sequences TO authenticated;
GRANT ALL ON public.receipt_sequences TO service_role;
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_admin_select" ON public.receipt_sequences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.next_sequence_number(_scope TEXT, _year INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_val INTEGER;
BEGIN
  INSERT INTO public.receipt_sequences (scope, year, last_value) VALUES (_scope, _year, 1)
  ON CONFLICT (scope, year) DO UPDATE SET last_value = public.receipt_sequences.last_value + 1, updated_at = now()
  RETURNING last_value INTO next_val;
  RETURN next_val;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number(_entity_type public.payment_entity_type)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE scope TEXT; y INTEGER; n INTEGER;
BEGIN
  scope := CASE _entity_type WHEN 'vendor' THEN 'VR' ELSE 'FR' END;
  y := EXTRACT(YEAR FROM now())::INTEGER;
  n := public.next_sequence_number(scope, y);
  RETURN 'P4U-' || scope || '-' || y::TEXT || '-' || LPAD(n::TEXT, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_franchise_registration_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y INTEGER; n INTEGER;
BEGIN
  y := EXTRACT(YEAR FROM now())::INTEGER;
  n := public.next_sequence_number('FR-REG', y);
  RETURN 'P4U-FR-REG-' || y::TEXT || '-' || LPAD(n::TEXT, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_franchise_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y INTEGER; n INTEGER;
BEGIN
  y := EXTRACT(YEAR FROM now())::INTEGER;
  n := public.next_sequence_number('FR-ID', y);
  RETURN 'P4U-FR-' || y::TEXT || '-' || LPAD(n::TEXT, 6, '0');
END; $$;

CREATE TABLE IF NOT EXISTS public.franchise_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_no TEXT UNIQUE,
  applicant_name TEXT NOT NULL,
  company_name TEXT, email TEXT, mobile TEXT, address TEXT,
  city TEXT, district TEXT, state TEXT, pincode TEXT, country TEXT DEFAULT 'India',
  plan_id UUID REFERENCES public.franchise_plans(id) ON DELETE SET NULL,
  requested_territory TEXT,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.franchise_registration_status NOT NULL DEFAULT 'pending',
  approved_by UUID, approved_at TIMESTAMPTZ, rejection_reason TEXT, notes TEXT,
  user_id UUID, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fr_status ON public.franchise_registrations(status);
CREATE INDEX IF NOT EXISTS idx_fr_email ON public.franchise_registrations(email);
CREATE INDEX IF NOT EXISTS idx_fr_plan ON public.franchise_registrations(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_registrations TO authenticated;
GRANT ALL ON public.franchise_registrations TO service_role;
ALTER TABLE public.franchise_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_select" ON public.franchise_registrations FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid()
  OR email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
);
CREATE POLICY "fr_insert" ON public.franchise_registrations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fr_admin_update" ON public.franchise_registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fr_admin_delete" ON public.franchise_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_fr_updated_at BEFORE UPDATE ON public.franchise_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_franchise_registration_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.registration_no IS NULL OR NEW.registration_no = '' THEN
    NEW.registration_no := public.generate_franchise_registration_number();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_fr_number BEFORE INSERT ON public.franchise_registrations FOR EACH ROW EXECUTE FUNCTION public.set_franchise_registration_number();

CREATE TABLE IF NOT EXISTS public.active_franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id TEXT UNIQUE,
  registration_id UUID REFERENCES public.franchise_registrations(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.franchise_plans(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  company_name TEXT, email TEXT, mobile TEXT, address TEXT,
  city TEXT, district TEXT, state TEXT, pincode TEXT,
  territory TEXT,
  coverage_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status public.active_franchise_status NOT NULL DEFAULT 'active',
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_af_status ON public.active_franchises(status);
CREATE INDEX IF NOT EXISTS idx_af_plan ON public.active_franchises(plan_id);
CREATE INDEX IF NOT EXISTS idx_af_email ON public.active_franchises(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_franchises TO authenticated;
GRANT ALL ON public.active_franchises TO service_role;
ALTER TABLE public.active_franchises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "af_select" ON public.active_franchises FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid()
  OR email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
);
CREATE POLICY "af_admin_insert" ON public.active_franchises FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "af_admin_update" ON public.active_franchises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "af_admin_delete" ON public.active_franchises FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_af_updated_at BEFORE UPDATE ON public.active_franchises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_active_franchise_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.franchise_id IS NULL OR NEW.franchise_id = '' THEN
    NEW.franchise_id := public.generate_franchise_id();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_af_id BEFORE INSERT ON public.active_franchises FOR EACH ROW EXECUTE FUNCTION public.set_active_franchise_id();

CREATE OR REPLACE FUNCTION public.convert_registration_to_franchise(_registration_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reg public.franchise_registrations%ROWTYPE; plan public.franchise_plans%ROWTYPE; new_id UUID; exp TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Only admins can convert registrations'; END IF;
  SELECT * INTO reg FROM public.franchise_registrations WHERE id = _registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  SELECT * INTO plan FROM public.franchise_plans WHERE id = reg.plan_id;
  exp := CASE WHEN plan.validity_months IS NOT NULL THEN now() + (plan.validity_months || ' months')::INTERVAL ELSE now() + INTERVAL '12 months' END;
  INSERT INTO public.active_franchises (
    registration_id, plan_id, owner_name, company_name, email, mobile,
    address, city, district, state, pincode, territory, started_at, expires_at, user_id, status
  ) VALUES (
    reg.id, reg.plan_id, reg.applicant_name, reg.company_name, reg.email, reg.mobile,
    reg.address, reg.city, reg.district, reg.state, reg.pincode, reg.requested_territory,
    now(), exp, reg.user_id, 'active'
  ) RETURNING id INTO new_id;
  UPDATE public.franchise_registrations SET status = 'converted', updated_at = now() WHERE id = reg.id;
  RETURN new_id;
END; $$;

CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.payment_entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  plan_id UUID,
  plan_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) GENERATED ALWAYS AS (plan_amount - amount_paid) STORED,
  payment_status public.payment_status_type NOT NULL DEFAULT 'pending',
  payment_mode public.payment_mode_type,
  transaction_ref TEXT,
  payment_date TIMESTAMPTZ,
  remarks TEXT,
  received_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pr_entity ON public.payment_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.payment_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_pr_date ON public.payment_records(payment_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_admin_all" ON public.payment_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pr_owner_select" ON public.payment_records FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (entity_type = 'vendor' AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = payment_records.entity_id
      AND v.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())))
  OR (entity_type = 'franchise' AND EXISTS (
    SELECT 1 FROM public.active_franchises af
    WHERE af.id::text = payment_records.entity_id AND af.user_id = auth.uid()))
);
CREATE TRIGGER trg_pr_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  entity_type public.payment_entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  issued_by UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prc_entity ON public.payment_receipts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_prc_payment ON public.payment_receipts(payment_record_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prc_admin_all" ON public.payment_receipts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "prc_owner_select" ON public.payment_receipts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (entity_type = 'vendor' AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = payment_receipts.entity_id
      AND v.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())))
  OR (entity_type = 'franchise' AND EXISTS (
    SELECT 1 FROM public.active_franchises af
    WHERE af.id::text = payment_receipts.entity_id AND af.user_id = auth.uid()))
);
CREATE TRIGGER trg_prc_updated_at BEFORE UPDATE ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.franchise_plans (name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, benefits, features, status, sort_order)
SELECT 'Nano','Nano',100000,2,'radius'::public.franchise_coverage_type,12,'Entry-level franchise for compact neighbourhoods.',
  '["Local territory rights","Basic marketing support","Dedicated dashboard"]'::jsonb,
  '["2 KM delivery radius","Basic onboarding","Standard support"]'::jsonb,
  'active'::public.franchise_plan_status,1
WHERE NOT EXISTS (SELECT 1 FROM public.franchise_plans WHERE name='Nano');

INSERT INTO public.franchise_plans (name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, benefits, features, status, sort_order)
SELECT 'Micro','Micro',500000,5,'radius'::public.franchise_coverage_type,12,'Small-territory franchise with growth support.',
  '["Priority local ranking","Marketing kit","Dedicated dashboard","Training program"]'::jsonb,
  '["5 KM delivery radius","Enhanced onboarding","Priority support"]'::jsonb,
  'active'::public.franchise_plan_status,2
WHERE NOT EXISTS (SELECT 1 FROM public.franchise_plans WHERE name='Micro');

INSERT INTO public.franchise_plans (name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, benefits, features, status, sort_order)
SELECT 'Mini','Mini',1000000,10,'radius'::public.franchise_coverage_type,24,'Mid-tier franchise with wider coverage.',
  '["Extended territory","Marketing co-op","Featured placement","Manager training"]'::jsonb,
  '["10 KM delivery radius","Premium onboarding","24x7 support"]'::jsonb,
  'active'::public.franchise_plan_status,3
WHERE NOT EXISTS (SELECT 1 FROM public.franchise_plans WHERE name='Mini');

INSERT INTO public.franchise_plans (name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, benefits, features, status, sort_order)
SELECT 'Master','Master',10000000,100,'radius'::public.franchise_coverage_type,36,'Regional master franchise with maximum benefits.',
  '["Regional exclusivity","Full marketing suite","Top ranking","Executive training","Revenue share"]'::jsonb,
  '["100 KM delivery radius","White-glove onboarding","Dedicated relationship manager"]'::jsonb,
  'active'::public.franchise_plan_status,4
WHERE NOT EXISTS (SELECT 1 FROM public.franchise_plans WHERE name='Master');
