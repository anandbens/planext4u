
-- ============================================================
-- MIGRATION A: Multi-country foundation
-- ============================================================

-- 1. Helper: updated_at trigger function (already exists in project, but ensure)
-- (using existing public.update_updated_at_column)

-- ============================================================
-- 2. COUNTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  currency_position TEXT NOT NULL DEFAULT 'before' CHECK (currency_position IN ('before','after')),
  decimal_places INTEGER NOT NULL DEFAULT 2,
  thousands_separator TEXT NOT NULL DEFAULT ',',
  decimal_separator TEXT NOT NULL DEFAULT '.',
  locale_code TEXT NOT NULL DEFAULT 'en-US',
  tax_label TEXT NOT NULL DEFAULT 'Tax',
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  phone_prefix TEXT NOT NULL DEFAULT '+1',
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone"
  ON public.countries FOR SELECT USING (true);

CREATE POLICY "Only admins can modify countries"
  ON public.countries FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. COUNTRY TAX RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  tax_name TEXT NOT NULL,                  -- 'CGST','SGST','IGST','VAT','WHT','State Sales Tax'
  tax_type TEXT NOT NULL DEFAULT 'percent',-- 'percent' | 'fixed'
  rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'all',  -- 'all'|'product'|'service'|'shipping'|'platform_fee'
  state_code TEXT,                          -- for US states (CA, NY...) or IN states
  is_inclusive BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_country_tax_rules_country ON public.country_tax_rules(country_code);
CREATE INDEX idx_country_tax_rules_state ON public.country_tax_rules(country_code, state_code);

ALTER TABLE public.country_tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tax rules are viewable by everyone"
  ON public.country_tax_rules FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tax rules"
  ON public.country_tax_rules FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_country_tax_rules_updated_at
  BEFORE UPDATE ON public.country_tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. COUNTRY PAYMENT GATEWAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  gateway TEXT NOT NULL,                    -- 'razorpay'|'paystack'|'stripe'|'cod'
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  public_key TEXT,
  webhook_url TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, gateway)
);

CREATE INDEX idx_country_gateways_country ON public.country_payment_gateways(country_code);

ALTER TABLE public.country_payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gateways are viewable by everyone"
  ON public.country_payment_gateways FOR SELECT USING (true);

CREATE POLICY "Only admins can modify gateways"
  ON public.country_payment_gateways FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_country_gateways_updated_at
  BEFORE UPDATE ON public.country_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. COUNTRY INVOICE CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_invoice_config (
  country_code TEXT PRIMARY KEY REFERENCES public.countries(code) ON DELETE CASCADE,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  credit_note_prefix TEXT NOT NULL DEFAULT 'CN',
  invoice_format TEXT NOT NULL DEFAULT '{prefix}-{vendor}-{fy}-{seq}',
  tax_id_label TEXT NOT NULL DEFAULT 'Tax ID',                -- 'GSTIN'|'TIN'|'EIN'
  tax_id_required_for_b2b BOOLEAN NOT NULL DEFAULT false,
  hsn_label TEXT,                                              -- 'HSN/SAC' (IN), null elsewhere
  show_place_of_supply BOOLEAN NOT NULL DEFAULT false,
  einvoice_enabled BOOLEAN NOT NULL DEFAULT false,
  einvoice_provider TEXT,                                      -- 'gst_einvoice'|'firs'|'irs'
  compliance_fields JSONB NOT NULL DEFAULT '{}'::jsonb,        -- IRN, QR, FIRS-IRN, etc.
  legal_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.country_invoice_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice config viewable by everyone"
  ON public.country_invoice_config FOR SELECT USING (true);

CREATE POLICY "Only admins can modify invoice config"
  ON public.country_invoice_config FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_country_invoice_config_updated_at
  BEFORE UPDATE ON public.country_invoice_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. PLATFORM SETTINGS (single-row global config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_country_code TEXT NOT NULL DEFAULT 'IN' REFERENCES public.countries(code),
  dropshipping_enabled BOOLEAN NOT NULL DEFAULT false,
  odoo_integration_enabled BOOLEAN NOT NULL DEFAULT false,
  multi_currency_display BOOLEAN NOT NULL DEFAULT false,
  last_country_switched_at TIMESTAMPTZ,
  last_country_switched_by UUID,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform settings viewable by everyone"
  ON public.platform_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can modify platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. COUNTRY SWITCH LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_switch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_country_code TEXT,
  to_country_code TEXT NOT NULL,
  switched_by UUID,
  switched_by_name TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.country_switch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view country switch log"
  ON public.country_switch_log FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admins can insert country switch log"
  ON public.country_switch_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================================
-- 8. SEED COUNTRIES (IN active default, NG + US ready but inactive)
-- ============================================================
INSERT INTO public.countries (code, name, currency_code, currency_symbol, currency_position, decimal_places, thousands_separator, decimal_separator, locale_code, tax_label, tax_inclusive, default_tax_rate, phone_prefix, flag_emoji, is_active, is_default, display_order)
VALUES
  ('IN', 'India',         'INR', '₹', 'before', 2, ',', '.', 'en-IN', 'GST',         false, 18.00, '+91',  '🇮🇳', true,  true,  1),
  ('NG', 'Nigeria',       'NGN', '₦', 'before', 2, ',', '.', 'en-NG', 'VAT',         false,  7.50, '+234', '🇳🇬', true,  false, 2),
  ('US', 'United States', 'USD', '$', 'before', 2, ',', '.', 'en-US', 'Sales Tax',   false,  0.00, '+1',   '🇺🇸', true,  false, 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 9. SEED TAX RULES
-- ============================================================
-- India: CGST/SGST split (intra-state) and IGST (inter-state); both totalling default rate
INSERT INTO public.country_tax_rules (country_code, tax_name, tax_type, rate, applies_to, is_inclusive, display_order, notes) VALUES
  ('IN', 'CGST',          'percent',  9.0000, 'all', false, 1, 'Central GST — 9% intra-state half'),
  ('IN', 'SGST',          'percent',  9.0000, 'all', false, 2, 'State GST — 9% intra-state half'),
  ('IN', 'IGST',          'percent', 18.0000, 'all', false, 3, 'Integrated GST — 18% inter-state'),
  ('IN', 'TCS',           'percent',  1.0000, 'platform_fee', false, 4, 'Tax Collected at Source on platform fee')
ON CONFLICT DO NOTHING;

INSERT INTO public.country_tax_rules (country_code, tax_name, tax_type, rate, applies_to, is_inclusive, display_order, notes) VALUES
  ('NG', 'VAT',           'percent',  7.5000, 'all', false, 1, 'Nigeria Value Added Tax (FIRS)'),
  ('NG', 'WHT',           'percent',  5.0000, 'service', false, 2, 'Withholding Tax on services')
ON CONFLICT DO NOTHING;

-- US: a few starter state rates; admin can edit/extend per-state
INSERT INTO public.country_tax_rules (country_code, tax_name, tax_type, rate, applies_to, state_code, display_order, notes) VALUES
  ('US', 'CA Sales Tax',  'percent',  7.2500, 'all', 'CA', 1, 'California base'),
  ('US', 'NY Sales Tax',  'percent',  4.0000, 'all', 'NY', 2, 'New York base'),
  ('US', 'TX Sales Tax',  'percent',  6.2500, 'all', 'TX', 3, 'Texas base'),
  ('US', 'FL Sales Tax',  'percent',  6.0000, 'all', 'FL', 4, 'Florida base')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. SEED PAYMENT GATEWAYS
-- ============================================================
INSERT INTO public.country_payment_gateways (country_code, gateway, display_name, is_enabled, is_default, mode, display_order) VALUES
  ('IN', 'razorpay', 'Razorpay',  true,  true,  'test', 1),
  ('IN', 'cod',      'Cash on Delivery', true, false, 'live', 2),
  ('NG', 'paystack', 'Paystack',  false, true,  'test', 1),
  ('NG', 'cod',      'Cash on Delivery', true, false, 'live', 2),
  ('US', 'stripe',   'Stripe',    false, true,  'test', 1)
ON CONFLICT (country_code, gateway) DO NOTHING;

-- ============================================================
-- 11. SEED INVOICE CONFIG
-- ============================================================
INSERT INTO public.country_invoice_config (country_code, invoice_prefix, credit_note_prefix, tax_id_label, tax_id_required_for_b2b, hsn_label, show_place_of_supply, einvoice_enabled, einvoice_provider, legal_footer)
VALUES
  ('IN', 'INV', 'CN', 'GSTIN', true,  'HSN/SAC', true,  false, 'gst_einvoice', 'Subject to Bengaluru jurisdiction. E.&O.E.'),
  ('NG', 'INV', 'CN', 'TIN',   true,  NULL,      false, false, 'firs',          'Issued in compliance with FIRS guidelines.'),
  ('US', 'INV', 'CN', 'EIN',   false, NULL,      false, false, NULL,            'Sales tax collected per state regulations.')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================
-- 12. SEED PLATFORM SETTINGS (single row, IN active)
-- ============================================================
INSERT INTO public.platform_settings (id, active_country_code, dropshipping_enabled, odoo_integration_enabled)
VALUES (1, 'IN', false, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. ADD currency_code + country_code TO TRANSACTIONAL TABLES
-- ============================================================

-- customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT;

-- vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT;

-- service_vendors (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_vendors') THEN
    EXECUTE 'ALTER TABLE public.service_vendors
      ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT ''IN'',
      ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT ''INR'',
      ADD COLUMN IF NOT EXISTS tax_id TEXT,
      ADD COLUMN IF NOT EXISTS tax_id_type TEXT';
  END IF;
END $$;

-- products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- classified_ads
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- food_orders
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- service_bookings
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'INR';

-- ============================================================
-- 14. HELPER FUNCTIONS
-- ============================================================

-- Returns the currently-active country code (IN/NG/US...)
CREATE OR REPLACE FUNCTION public.get_active_country_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_country_code FROM public.platform_settings WHERE id = 1
$$;

-- Returns the active country row as jsonb
CREATE OR REPLACE FUNCTION public.get_active_country()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(c.*)
  FROM public.platform_settings p
  JOIN public.countries c ON c.code = p.active_country_code
  WHERE p.id = 1
$$;

-- Switches the active country (admin only) and writes to switch log
CREATE OR REPLACE FUNCTION public.switch_active_country(_to_code TEXT, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from TEXT;
  _name TEXT;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can switch active country';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.countries WHERE code = _to_code AND is_active = true) THEN
    RAISE EXCEPTION 'Country % is not registered or active', _to_code;
  END IF;

  SELECT active_country_code INTO _from FROM public.platform_settings WHERE id = 1;

  IF _from = _to_code THEN
    RETURN jsonb_build_object('ok', true, 'note', 'Already active', 'country', _to_code);
  END IF;

  UPDATE public.platform_settings
    SET active_country_code = _to_code,
        last_country_switched_at = now(),
        last_country_switched_by = auth.uid(),
        updated_at = now()
    WHERE id = 1;

  BEGIN
    SELECT name INTO _name FROM public.customers WHERE id = auth.uid()::text LIMIT 1;
  EXCEPTION WHEN OTHERS THEN _name := NULL; END;

  INSERT INTO public.country_switch_log (from_country_code, to_country_code, switched_by, switched_by_name, reason)
  VALUES (_from, _to_code, auth.uid(), _name, _reason);

  RETURN jsonb_build_object('ok', true, 'from', _from, 'to', _to_code);
END;
$$;
