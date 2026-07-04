
-- ============================================================
-- COUPON MODULE
-- ============================================================

-- 1) CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.coupon_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  max_discount numeric(12,2),
  min_order_amount numeric(12,2) NOT NULL DEFAULT 0,

  vendor_id text REFERENCES public.vendors(id) ON DELETE SET NULL,
  product_ids text[] NOT NULL DEFAULT '{}',
  district_ids text[] NOT NULL DEFAULT '{}',

  use_geo_radius boolean NOT NULL DEFAULT false,
  radius_km numeric(6,2),
  center_lat double precision,
  center_lng double precision,

  first_time_only boolean NOT NULL DEFAULT false,
  qty_limit integer NOT NULL DEFAULT 1 CHECK (qty_limit >= 1),
  per_customer_limit integer NOT NULL DEFAULT 1 CHECK (per_customer_limit >= 1),

  code_mode text NOT NULL DEFAULT 'unique_single_use'
    CHECK (code_mode IN ('unique_single_use','shared_per_customer')),
  shared_code text,

  popup_enabled boolean NOT NULL DEFAULT false,
  popup_title text,
  popup_description text,
  popup_image_url text,
  popup_target text NOT NULL DEFAULT 'new_users'
    CHECK (popup_target IN ('new_users','all')),

  total_codes_target integer NOT NULL DEFAULT 0,
  total_codes_generated integer NOT NULL DEFAULT 0,
  total_codes_used integer NOT NULL DEFAULT 0,

  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_active ON public.coupon_campaigns(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_vendor ON public.coupon_campaigns(vendor_id);

GRANT SELECT ON public.coupon_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupon_campaigns TO authenticated;
GRANT ALL ON public.coupon_campaigns TO service_role;

ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active campaigns"
  ON public.coupon_campaigns FOR SELECT
  USING (
    is_active = true
    OR public.is_admin_user(auth.uid())
    OR (vendor_id IS NOT NULL AND vendor_id IN (
      SELECT ur.vendor_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'vendor'
    ))
  );

CREATE POLICY "Admins manage campaigns"
  ON public.coupon_campaigns FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));


-- 2) CODES
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','used','expired','disabled')),
  used_by_customer_id text,
  used_by_mobile text,
  used_order_id text,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_codes_campaign ON public.coupon_codes(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON public.coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_used_by ON public.coupon_codes(used_by_customer_id);

GRANT SELECT ON public.coupon_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupon_codes TO authenticated;
GRANT ALL ON public.coupon_codes TO service_role;

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage all codes"
  ON public.coupon_codes FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Vendor sees own campaign codes"
  ON public.coupon_codes FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM public.coupon_campaigns c
      WHERE c.vendor_id IN (
        SELECT ur.vendor_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'vendor'
      )
    )
  );

CREATE POLICY "Customer sees own used codes"
  ON public.coupon_codes FOR SELECT
  USING (
    used_by_customer_id = public.get_customer_id(auth.uid())
  );


-- 3) REDEMPTIONS
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  code text NOT NULL,
  customer_id text NOT NULL,
  customer_mobile text,
  order_id text,
  product_id text,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_campaign_customer
  ON public.coupon_redemptions(campaign_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON public.coupon_redemptions(order_id);

GRANT SELECT ON public.coupon_redemptions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage redemptions"
  ON public.coupon_redemptions FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Customer sees own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()));

CREATE POLICY "Vendor sees redemptions on own campaigns"
  ON public.coupon_redemptions FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM public.coupon_campaigns c
      WHERE c.vendor_id IN (
        SELECT ur.vendor_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'vendor'
      )
    )
  );


-- 4) POPUP DISMISSALS
CREATE TABLE IF NOT EXISTS public.coupon_popup_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  dismissed_permanently boolean NOT NULL DEFAULT false,
  last_dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.coupon_popup_dismissals TO authenticated;
GRANT ALL ON public.coupon_popup_dismissals TO service_role;

ALTER TABLE public.coupon_popup_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer manages own dismissals"
  ON public.coupon_popup_dismissals FOR ALL
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

CREATE POLICY "Admin sees all dismissals"
  ON public.coupon_popup_dismissals FOR SELECT
  USING (public.is_admin_user(auth.uid()));


-- 5) ORDER COLUMNS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS coupon_campaign_id uuid REFERENCES public.coupon_campaigns(id),
  ADD COLUMN IF NOT EXISTS coupon_discount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_snapshot jsonb;


-- 6) HELPER: random 6-8 char alnum code
CREATE OR REPLACE FUNCTION public.generate_random_coupon_code(_len int)
RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path=public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out_text text := '';
  i int := 0;
BEGIN
  FOR i IN 1.._len LOOP
    out_text := out_text || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN out_text;
END; $$;


-- 7) BULK GENERATE
CREATE OR REPLACE FUNCTION public.generate_coupon_codes(_campaign_id uuid, _count int, _length int DEFAULT 8)
RETURNS TABLE(code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  i int := 0;
  new_code text;
  attempts int;
  camp public.coupon_campaigns%ROWTYPE;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can generate coupon codes';
  END IF;
  IF _count < 1 OR _count > 5000 THEN
    RAISE EXCEPTION 'Count must be between 1 and 5000';
  END IF;
  IF _length < 6 OR _length > 12 THEN _length := 8; END IF;

  SELECT * INTO camp FROM public.coupon_campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF camp.code_mode = 'shared_per_customer' THEN
    -- generate ONE shared code
    IF camp.shared_code IS NOT NULL AND length(camp.shared_code) > 0 THEN
      RETURN QUERY SELECT camp.shared_code;
      RETURN;
    END IF;
    LOOP
      new_code := public.generate_random_coupon_code(_length);
      BEGIN
        UPDATE public.coupon_campaigns SET shared_code = new_code WHERE id = _campaign_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
    RETURN QUERY SELECT new_code;
    RETURN;
  END IF;

  WHILE i < _count LOOP
    attempts := 0;
    LOOP
      new_code := public.generate_random_coupon_code(_length);
      BEGIN
        INSERT INTO public.coupon_codes (campaign_id, code) VALUES (_campaign_id, new_code);
        i := i + 1;
        code := new_code;
        RETURN NEXT;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN
          _length := _length + 1;
        END IF;
        IF attempts > 30 THEN
          RAISE EXCEPTION 'Could not generate unique code';
        END IF;
      END;
    END LOOP;
  END LOOP;

  UPDATE public.coupon_campaigns
    SET total_codes_generated = total_codes_generated + _count,
        updated_at = now()
    WHERE id = _campaign_id;
END; $$;


-- 8) VALIDATE (called from checkout)
CREATE OR REPLACE FUNCTION public.validate_coupon_code(
  _code text,
  _customer_id text,
  _cart_items jsonb,
  _subtotal numeric,
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  code_row public.coupon_codes%ROWTYPE;
  cust public.customers%ROWTYPE;
  addr_match boolean := false;
  radius_match boolean := false;
  eligible_product jsonb;
  target_item jsonb;
  applied_qty int := 0;
  unit_price numeric := 0;
  discount numeric := 0;
  prior_orders int;
  redemption_count int;
  matched_product_id text;
  dist_km numeric;
BEGIN
  IF _code IS NULL OR _code = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Enter a coupon code');
  END IF;
  _code := upper(trim(_code));

  -- find campaign by shared_code first, else by code row
  SELECT * INTO camp FROM public.coupon_campaigns
    WHERE upper(shared_code) = _code AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO code_row FROM public.coupon_codes WHERE upper(code) = _code LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Invalid coupon');
    END IF;
    IF code_row.status <> 'active' THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Coupon already used or expired');
    END IF;
    SELECT * INTO camp FROM public.coupon_campaigns WHERE id = code_row.campaign_id;
  END IF;

  IF NOT camp.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Campaign inactive');
  END IF;
  IF camp.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not yet active');
  END IF;
  IF camp.expires_at IS NOT NULL AND camp.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon expired');
  END IF;
  IF _subtotal < camp.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Minimum order ' || camp.min_order_amount || ' required');
  END IF;

  -- customer
  SELECT * INTO cust FROM public.customers WHERE id = _customer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Customer not found');
  END IF;

  -- first-time only?
  IF camp.first_time_only THEN
    SELECT COUNT(*) INTO prior_orders FROM public.orders
      WHERE customer_id = _customer_id AND status NOT IN ('cancelled');
    IF prior_orders > 0 THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Coupon is for first-time users only');
    END IF;
  END IF;

  -- per-customer limit
  SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions
    WHERE campaign_id = camp.id AND customer_id = _customer_id;
  IF redemption_count >= camp.per_customer_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You have already used this coupon');
  END IF;

  -- district match (customer_addresses.city → district) OR live geo radius
  IF array_length(camp.district_ids, 1) IS NOT NULL AND array_length(camp.district_ids, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.customer_addresses ca
      JOIN public.districts d ON lower(d.name) = lower(ca.city)
      WHERE ca.customer_id = _customer_id
        AND d.id = ANY(camp.district_ids)
    ) INTO addr_match;

    IF camp.use_geo_radius AND _lat IS NOT NULL AND _lng IS NOT NULL
       AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
      dist_km := public.haversine_distance(_lat, _lng, camp.center_lat, camp.center_lng);
      IF dist_km <= COALESCE(camp.radius_km, 0) THEN
        radius_match := true;
      END IF;
    END IF;

    IF NOT addr_match AND NOT radius_match THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not valid in your location');
    END IF;
  END IF;

  -- vendor / product scope: must have at least one matching item in cart
  FOR target_item IN SELECT * FROM jsonb_array_elements(_cart_items) LOOP
    IF camp.vendor_id IS NOT NULL AND (target_item->>'vendor_id') <> camp.vendor_id THEN
      CONTINUE;
    END IF;
    IF array_length(camp.product_ids, 1) IS NOT NULL AND array_length(camp.product_ids, 1) > 0 THEN
      IF NOT ((target_item->>'id') = ANY(camp.product_ids)) THEN
        CONTINUE;
      END IF;
    END IF;
    eligible_product := target_item;
    matched_product_id := target_item->>'id';
    EXIT;
  END LOOP;

  IF eligible_product IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'No matching product in cart for this coupon');
  END IF;

  -- compute discount on capped qty
  applied_qty := LEAST(COALESCE((eligible_product->>'qty')::int, 1), camp.qty_limit);
  unit_price := COALESCE((eligible_product->>'price')::numeric, 0);
  IF camp.discount_type = 'percent' THEN
    discount := round(unit_price * applied_qty * camp.discount_value / 100.0, 2);
    IF camp.max_discount IS NOT NULL AND discount > camp.max_discount THEN
      discount := camp.max_discount;
    END IF;
  ELSE
    discount := LEAST(camp.discount_value, unit_price * applied_qty);
  END IF;

  IF discount <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Discount could not be applied');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'campaign_id', camp.id,
    'code', _code,
    'discount_amount', discount,
    'discount_type', camp.discount_type,
    'discount_value', camp.discount_value,
    'product_id', matched_product_id,
    'qty_applied', applied_qty,
    'vendor_id', camp.vendor_id,
    'name', camp.name,
    'blocks_points', true
  );
END; $$;


-- 9) REDEEM (called after order placed)
CREATE OR REPLACE FUNCTION public.redeem_coupon_code(
  _code text,
  _customer_id text,
  _order_id text,
  _product_id text,
  _discount_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  code_row public.coupon_codes%ROWTYPE;
  cust_mobile text;
BEGIN
  _code := upper(trim(_code));
  SELECT * INTO camp FROM public.coupon_campaigns
    WHERE upper(shared_code) = _code AND is_active = true
    LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO code_row FROM public.coupon_codes WHERE upper(code) = _code FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Invalid coupon');
    END IF;
    IF code_row.status <> 'active' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Coupon already used');
    END IF;
    SELECT * INTO camp FROM public.coupon_campaigns WHERE id = code_row.campaign_id;
  END IF;

  SELECT mobile INTO cust_mobile FROM public.customers WHERE id = _customer_id;

  INSERT INTO public.coupon_redemptions
    (campaign_id, coupon_code_id, code, customer_id, customer_mobile, order_id, product_id, discount_amount)
  VALUES
    (camp.id, code_row.id, _code, _customer_id, cust_mobile, _order_id, _product_id, _discount_amount)
  ON CONFLICT (campaign_id, customer_id, order_id) DO NOTHING;

  IF code_row.id IS NOT NULL THEN
    UPDATE public.coupon_codes
      SET status = 'used', used_by_customer_id = _customer_id, used_by_mobile = cust_mobile,
          used_order_id = _order_id, used_at = now()
      WHERE id = code_row.id AND status = 'active';
  END IF;

  UPDATE public.coupon_campaigns
    SET total_codes_used = total_codes_used + 1, updated_at = now()
    WHERE id = camp.id;

  RETURN jsonb_build_object('ok', true, 'campaign_id', camp.id);
END; $$;


-- 10) LIST CUSTOMER'S AVAILABLE COUPONS
CREATE OR REPLACE FUNCTION public.get_customer_available_coupons(
  _customer_id text,
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL
)
RETURNS TABLE(
  campaign_id uuid,
  name text,
  description text,
  discount_type text,
  discount_value numeric,
  max_discount numeric,
  min_order_amount numeric,
  vendor_id text,
  product_ids text[],
  qty_limit int,
  expires_at timestamptz,
  code text,
  code_mode text,
  popup_image_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  camp record;
  cust_district_ids text[];
  addr_match boolean;
  radius_match boolean;
  prior_orders int;
  redemption_count int;
  assigned_code text;
  dist_km numeric;
BEGIN
  -- collect customer districts once
  SELECT COALESCE(array_agg(d.id), '{}') INTO cust_district_ids
  FROM public.customer_addresses ca
  JOIN public.districts d ON lower(d.name) = lower(ca.city)
  WHERE ca.customer_id = _customer_id;

  FOR camp IN
    SELECT * FROM public.coupon_campaigns
     WHERE is_active = true
       AND starts_at <= now()
       AND (expires_at IS NULL OR expires_at > now())
  LOOP
    -- first-time only
    IF camp.first_time_only THEN
      SELECT COUNT(*) INTO prior_orders FROM public.orders
        WHERE customer_id = _customer_id AND status NOT IN ('cancelled');
      IF prior_orders > 0 THEN CONTINUE; END IF;
    END IF;

    -- per-customer limit
    SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions
      WHERE campaign_id = camp.id AND customer_id = _customer_id;
    IF redemption_count >= camp.per_customer_limit THEN CONTINUE; END IF;

    -- district / radius
    IF array_length(camp.district_ids, 1) IS NOT NULL AND array_length(camp.district_ids, 1) > 0 THEN
      addr_match := (cust_district_ids && camp.district_ids);
      radius_match := false;
      IF camp.use_geo_radius AND _lat IS NOT NULL AND _lng IS NOT NULL
         AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
        dist_km := public.haversine_distance(_lat, _lng, camp.center_lat, camp.center_lng);
        IF dist_km <= COALESCE(camp.radius_km, 0) THEN radius_match := true; END IF;
      END IF;
      IF NOT addr_match AND NOT radius_match THEN CONTINUE; END IF;
    END IF;

    -- pick code
    IF camp.code_mode = 'shared_per_customer' THEN
      assigned_code := camp.shared_code;
    ELSE
      -- reserve nothing here; user just sees existence via campaign
      SELECT cc.code INTO assigned_code FROM public.coupon_codes cc
        WHERE cc.campaign_id = camp.id AND cc.status = 'active'
        LIMIT 1;
      IF assigned_code IS NULL THEN CONTINUE; END IF;
    END IF;

    campaign_id := camp.id;
    name := camp.name;
    description := camp.description;
    discount_type := camp.discount_type;
    discount_value := camp.discount_value;
    max_discount := camp.max_discount;
    min_order_amount := camp.min_order_amount;
    vendor_id := camp.vendor_id;
    product_ids := camp.product_ids;
    qty_limit := camp.qty_limit;
    expires_at := camp.expires_at;
    code := assigned_code;
    code_mode := camp.code_mode;
    popup_image_url := camp.popup_image_url;
    RETURN NEXT;
  END LOOP;
END; $$;


-- 11) UPDATED_AT trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_coupon_campaigns_updated ON public.coupon_campaigns;
CREATE TRIGGER trg_coupon_campaigns_updated
  BEFORE UPDATE ON public.coupon_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT EXECUTE ON FUNCTION public.generate_coupon_codes(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(text, text, jsonb, numeric, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_code(text, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_available_coupons(text, double precision, double precision) TO authenticated;
