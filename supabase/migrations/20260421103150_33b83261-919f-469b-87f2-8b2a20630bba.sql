
-- ============================================================
-- 1. GEOGRAPHY: Add country_code to all geo tables
-- ============================================================

ALTER TABLE public.states ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';

-- Add FK to countries (defer validation so existing data passes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='states_country_code_fkey') THEN
    ALTER TABLE public.states ADD CONSTRAINT states_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cities_country_code_fkey') THEN
    ALTER TABLE public.cities ADD CONSTRAINT cities_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='districts_country_code_fkey') THEN
    ALTER TABLE public.districts ADD CONSTRAINT districts_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='areas_country_code_fkey') THEN
    ALTER TABLE public.areas ADD CONSTRAINT areas_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code) ON DELETE RESTRICT;
  END IF;
END $$;

-- Replace global UNIQUE on state code with composite (country, code)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='states_code_key' AND table_name='states') THEN
    ALTER TABLE public.states DROP CONSTRAINT states_code_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='states_country_code_unique') THEN
    ALTER TABLE public.states ADD CONSTRAINT states_country_code_unique UNIQUE (country_code, code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_states_country ON public.states(country_code, status);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country_code, status);
CREATE INDEX IF NOT EXISTS idx_districts_country ON public.districts(country_code, status);
CREATE INDEX IF NOT EXISTS idx_areas_country ON public.areas(country_code, status);

-- Add postal_code to customer_addresses (optional for international)
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';

-- ============================================================
-- 2. SEED NIGERIAN STATES (36 + FCT)
-- ============================================================
INSERT INTO public.states (id, name, code, country_code, status) VALUES
  (gen_random_uuid(), 'Abia', 'AB', 'NG', 'active'),
  (gen_random_uuid(), 'Adamawa', 'AD', 'NG', 'active'),
  (gen_random_uuid(), 'Akwa Ibom', 'AK', 'NG', 'active'),
  (gen_random_uuid(), 'Anambra', 'AN', 'NG', 'active'),
  (gen_random_uuid(), 'Bauchi', 'BA', 'NG', 'active'),
  (gen_random_uuid(), 'Bayelsa', 'BY', 'NG', 'active'),
  (gen_random_uuid(), 'Benue', 'BE', 'NG', 'active'),
  (gen_random_uuid(), 'Borno', 'BO', 'NG', 'active'),
  (gen_random_uuid(), 'Cross River', 'CR', 'NG', 'active'),
  (gen_random_uuid(), 'Delta', 'DE', 'NG', 'active'),
  (gen_random_uuid(), 'Ebonyi', 'EB', 'NG', 'active'),
  (gen_random_uuid(), 'Edo', 'ED', 'NG', 'active'),
  (gen_random_uuid(), 'Ekiti', 'EK', 'NG', 'active'),
  (gen_random_uuid(), 'Enugu', 'EN', 'NG', 'active'),
  (gen_random_uuid(), 'Federal Capital Territory', 'FC', 'NG', 'active'),
  (gen_random_uuid(), 'Gombe', 'GO', 'NG', 'active'),
  (gen_random_uuid(), 'Imo', 'IM', 'NG', 'active'),
  (gen_random_uuid(), 'Jigawa', 'JI', 'NG', 'active'),
  (gen_random_uuid(), 'Kaduna', 'KD', 'NG', 'active'),
  (gen_random_uuid(), 'Kano', 'KN', 'NG', 'active'),
  (gen_random_uuid(), 'Katsina', 'KT', 'NG', 'active'),
  (gen_random_uuid(), 'Kebbi', 'KE', 'NG', 'active'),
  (gen_random_uuid(), 'Kogi', 'KO', 'NG', 'active'),
  (gen_random_uuid(), 'Kwara', 'KW', 'NG', 'active'),
  (gen_random_uuid(), 'Lagos', 'LA', 'NG', 'active'),
  (gen_random_uuid(), 'Nasarawa', 'NA', 'NG', 'active'),
  (gen_random_uuid(), 'Niger', 'NI', 'NG', 'active'),
  (gen_random_uuid(), 'Ogun', 'OG', 'NG', 'active'),
  (gen_random_uuid(), 'Ondo', 'ON', 'NG', 'active'),
  (gen_random_uuid(), 'Osun', 'OS', 'NG', 'active'),
  (gen_random_uuid(), 'Oyo', 'OY', 'NG', 'active'),
  (gen_random_uuid(), 'Plateau', 'PL', 'NG', 'active'),
  (gen_random_uuid(), 'Rivers', 'RI', 'NG', 'active'),
  (gen_random_uuid(), 'Sokoto', 'SO', 'NG', 'active'),
  (gen_random_uuid(), 'Taraba', 'TA', 'NG', 'active'),
  (gen_random_uuid(), 'Yobe', 'YO', 'NG', 'active'),
  (gen_random_uuid(), 'Zamfara', 'ZA', 'NG', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. SEED MAJOR NIGERIAN CITIES
-- ============================================================
INSERT INTO public.cities (id, name, state, country_code, status) VALUES
  ('NG-LOS', 'Lagos',          'Lagos', 'NG', 'active'),
  ('NG-IKJ', 'Ikeja',           'Lagos', 'NG', 'active'),
  ('NG-LEK', 'Lekki',           'Lagos', 'NG', 'active'),
  ('NG-VIC', 'Victoria Island', 'Lagos', 'NG', 'active'),
  ('NG-ABJ', 'Abuja',           'Federal Capital Territory', 'NG', 'active'),
  ('NG-GAR', 'Garki',           'Federal Capital Territory', 'NG', 'active'),
  ('NG-WUS', 'Wuse',            'Federal Capital Territory', 'NG', 'active'),
  ('NG-KAN', 'Kano',            'Kano', 'NG', 'active'),
  ('NG-PHC', 'Port Harcourt',   'Rivers', 'NG', 'active'),
  ('NG-IBA', 'Ibadan',          'Oyo', 'NG', 'active'),
  ('NG-KAD', 'Kaduna',          'Kaduna', 'NG', 'active'),
  ('NG-BEN', 'Benin City',      'Edo', 'NG', 'active'),
  ('NG-ENU', 'Enugu',           'Enugu', 'NG', 'active'),
  ('NG-ABE', 'Abeokuta',        'Ogun', 'NG', 'active'),
  ('NG-JOS', 'Jos',             'Plateau', 'NG', 'active'),
  ('NG-ILO', 'Ilorin',          'Kwara', 'NG', 'active'),
  ('NG-ONI', 'Onitsha',         'Anambra', 'NG', 'active'),
  ('NG-WAR', 'Warri',           'Delta', 'NG', 'active'),
  ('NG-CAL', 'Calabar',         'Cross River', 'NG', 'active'),
  ('NG-UYO', 'Uyo',             'Akwa Ibom', 'NG', 'active'),
  ('NG-ABA', 'Aba',             'Abia', 'NG', 'active'),
  ('NG-OWE', 'Owerri',          'Imo', 'NG', 'active'),
  ('NG-AKU', 'Akure',           'Ondo', 'NG', 'active'),
  ('NG-ADO', 'Ado-Ekiti',       'Ekiti', 'NG', 'active'),
  ('NG-MAI', 'Maiduguri',       'Borno', 'NG', 'active'),
  ('NG-SOK', 'Sokoto',          'Sokoto', 'NG', 'active'),
  ('NG-ZAR', 'Zaria',           'Kaduna', 'NG', 'active'),
  ('NG-MIN', 'Minna',           'Niger', 'NG', 'active'),
  ('NG-LOK', 'Lokoja',          'Kogi', 'NG', 'active'),
  ('NG-OSO', 'Osogbo',          'Osun', 'NG', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. CART RULES ENGINE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  country_code TEXT NOT NULL DEFAULT 'IN' REFERENCES public.countries(code),
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all','category','vendor','product','module')),
  module TEXT NOT NULL DEFAULT 'ecommerce' CHECK (module IN ('ecommerce','food','services','classifieds')),

  min_cart_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_cart_value NUMERIC(12,2),

  -- conditions: JSON array of eligibility checks (categories, vendor_ids, product_ids, customer_tier, first_order_only, etc.)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- actions: discount_type (percent|flat|free_shipping|bogo), discount_value, max_discount, applies_to (cart|item|shipping)
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- who absorbs the discount cost
  discount_bearer TEXT NOT NULL DEFAULT 'p4u' CHECK (discount_bearer IN ('p4u','vendor','shared')),
  bearer_split JSONB DEFAULT '{"p4u":100,"vendor":0}'::jsonb,

  priority INTEGER NOT NULL DEFAULT 0,
  stackable BOOLEAN NOT NULL DEFAULT false,

  total_uses INTEGER NOT NULL DEFAULT 0,
  max_total_uses INTEGER,
  max_uses_per_customer INTEGER NOT NULL DEFAULT 0,

  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_rules_active ON public.cart_rules(country_code, is_active, module, priority DESC);

ALTER TABLE public.cart_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cart rules publicly readable when active"
  ON public.cart_rules FOR SELECT
  USING (is_active = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage cart rules"
  ON public.cart_rules FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================================
-- 5. CART RULE APPLICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_rule_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.cart_rules(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  order_id TEXT,
  food_order_id TEXT,
  customer_id TEXT NOT NULL,
  vendor_id TEXT,

  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_bearer TEXT NOT NULL DEFAULT 'p4u',
  bearer_breakup JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_snapshot JSONB,

  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (order_id IS NOT NULL OR food_order_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cart_rule_apps_order ON public.cart_rule_applications(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_rule_apps_food ON public.cart_rule_applications(food_order_id) WHERE food_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_rule_apps_customer ON public.cart_rule_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_rule_apps_vendor ON public.cart_rule_applications(vendor_id) WHERE vendor_id IS NOT NULL;

ALTER TABLE public.cart_rule_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own rule applications"
  ON public.cart_rule_applications FOR SELECT
  TO authenticated
  USING (
    customer_id = (auth.uid())::text
    OR public.is_admin_user(auth.uid())
    OR (vendor_id IS NOT NULL AND vendor_id = public.get_vendor_id(auth.uid()))
  );

CREATE POLICY "Admins manage rule applications"
  ON public.cart_rule_applications FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================================
-- 6. ADD CART-RULE COLUMNS TO ORDERS
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS applied_cart_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cart_rule_discount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS applied_cart_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cart_rule_discount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 7. evaluate_cart_rules() — returns line-by-line breakup
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_cart_rules(
  _customer_id TEXT,
  _items JSONB,
  _subtotal NUMERIC,
  _module TEXT DEFAULT 'ecommerce',
  _country_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _country TEXT;
  _result JSONB := '[]'::jsonb;
  _total_discount NUMERIC := 0;
  r RECORD;
  _discount NUMERIC;
  _used_count INT;
  _rule_disc_type TEXT;
  _rule_disc_value NUMERIC;
  _rule_max NUMERIC;
BEGIN
  _country := COALESCE(_country_code, public.get_active_country_code(), 'IN');

  FOR r IN
    SELECT * FROM public.cart_rules
    WHERE is_active = true
      AND country_code = _country
      AND module = _module
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
      AND _subtotal >= min_cart_value
      AND (max_cart_value IS NULL OR _subtotal <= max_cart_value)
      AND (max_total_uses IS NULL OR total_uses < max_total_uses)
    ORDER BY priority DESC, created_at ASC
  LOOP
    -- per-customer usage cap
    IF r.max_uses_per_customer > 0 THEN
      SELECT COUNT(*) INTO _used_count FROM public.cart_rule_applications
        WHERE rule_id = r.id AND customer_id = _customer_id;
      IF _used_count >= r.max_uses_per_customer THEN CONTINUE; END IF;
    END IF;

    _rule_disc_type := r.actions->>'discount_type';
    _rule_disc_value := COALESCE((r.actions->>'discount_value')::numeric, 0);
    _rule_max := NULLIF(r.actions->>'max_discount','')::numeric;

    IF _rule_disc_type = 'percent' THEN
      _discount := round((_subtotal - _total_discount) * _rule_disc_value / 100.0, 2);
      IF _rule_max IS NOT NULL AND _discount > _rule_max THEN _discount := _rule_max; END IF;
    ELSIF _rule_disc_type = 'flat' THEN
      _discount := LEAST(_rule_disc_value, _subtotal - _total_discount);
    ELSIF _rule_disc_type = 'free_shipping' THEN
      _discount := COALESCE((r.actions->>'shipping_value')::numeric, 0);
    ELSE
      _discount := 0;
    END IF;

    IF _discount <= 0 THEN CONTINUE; END IF;

    _result := _result || jsonb_build_object(
      'rule_id', r.id,
      'name', r.name,
      'description', r.description,
      'discount_type', _rule_disc_type,
      'discount_value', _rule_disc_value,
      'discount_amount', _discount,
      'discount_bearer', r.discount_bearer,
      'bearer_split', r.bearer_split,
      'applies_to', COALESCE(r.actions->>'applies_to', 'cart'),
      'scope', r.scope
    );

    _total_discount := _total_discount + _discount;
    EXIT WHEN NOT r.stackable;
  END LOOP;

  RETURN jsonb_build_object(
    'rules', _result,
    'total_discount', _total_discount,
    'subtotal', _subtotal,
    'final_subtotal', _subtotal - _total_discount
  );
END;
$$;

-- updated_at trigger
CREATE TRIGGER set_cart_rules_updated_at
  BEFORE UPDATE ON public.cart_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
