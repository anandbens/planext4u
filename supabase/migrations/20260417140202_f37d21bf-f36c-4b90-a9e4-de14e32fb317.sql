-- ─── Coupons ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_platform_wide BOOLEAN NOT NULL DEFAULT false,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  total_usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_coupons_code ON public.food_coupons(code);
CREATE INDEX IF NOT EXISTS idx_food_coupons_restaurant ON public.food_coupons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_coupons_active ON public.food_coupons(is_active, expires_at);

ALTER TABLE public.food_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.food_coupons;
CREATE POLICY "Anyone can view active coupons" ON public.food_coupons
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage coupons" ON public.food_coupons;
CREATE POLICY "Admins manage coupons" ON public.food_coupons
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_food_coupons_updated
  BEFORE UPDATE ON public.food_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Coupon redemptions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.food_coupons(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_coupon_redemptions_customer ON public.food_coupon_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_coupon_redemptions_coupon ON public.food_coupon_redemptions(coupon_id);

ALTER TABLE public.food_coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers see own redemptions" ON public.food_coupon_redemptions;
CREATE POLICY "Customers see own redemptions" ON public.food_coupon_redemptions
  FOR SELECT USING (
    customer_id = public.get_customer_id(auth.uid()) OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "System inserts redemptions" ON public.food_coupon_redemptions;
CREATE POLICY "System inserts redemptions" ON public.food_coupon_redemptions
  FOR INSERT WITH CHECK (true);

-- ─── Extend food_orders with checkout polish fields ──────────
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS donation_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_contactless BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_cutlery BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_amount_used NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rider_note TEXT;

CREATE INDEX IF NOT EXISTS idx_food_orders_scheduled ON public.food_orders(scheduled_for);

-- ─── Coupon validation RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_food_coupon(
  _code TEXT,
  _customer_id TEXT,
  _restaurant_id TEXT,
  _subtotal NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.food_coupons%ROWTYPE;
  uses INT;
  applied NUMERIC;
BEGIN
  SELECT * INTO c FROM public.food_coupons
  WHERE upper(code) = upper(_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid code');
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon expired');
  END IF;

  IF c.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not yet active');
  END IF;

  IF NOT c.is_platform_wide AND c.restaurant_id IS NOT NULL AND c.restaurant_id <> _restaurant_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not valid for this restaurant');
  END IF;

  IF _subtotal < c.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Min order ₹' || c.min_order_amount::text || ' required');
  END IF;

  IF c.total_usage_limit IS NOT NULL AND c.usage_count >= c.total_usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon fully redeemed');
  END IF;

  SELECT COUNT(*) INTO uses FROM public.food_coupon_redemptions
  WHERE coupon_id = c.id AND customer_id = _customer_id;

  IF uses >= c.per_customer_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You already used this coupon');
  END IF;

  IF c.discount_type = 'percent' THEN
    applied := round(_subtotal * c.discount_value / 100.0);
    IF c.max_discount IS NOT NULL AND applied > c.max_discount THEN
      applied := c.max_discount;
    END IF;
  ELSE
    applied := c.discount_value;
  END IF;

  IF applied > _subtotal THEN applied := _subtotal; END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'title', c.title,
    'discount', applied
  );
END;
$$;

-- ─── Auto-suggest best coupon ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.best_food_coupon(
  _customer_id TEXT,
  _restaurant_id TEXT,
  _subtotal NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  best jsonb := jsonb_build_object('valid', false);
  best_amt NUMERIC := 0;
  result jsonb;
  amt NUMERIC;
BEGIN
  FOR c IN
    SELECT * FROM public.food_coupons
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND starts_at <= now()
      AND _subtotal >= min_order_amount
      AND (is_platform_wide = true OR restaurant_id = _restaurant_id)
  LOOP
    result := public.validate_food_coupon(c.code, _customer_id, _restaurant_id, _subtotal);
    IF (result->>'valid')::boolean THEN
      amt := (result->>'discount')::numeric;
      IF amt > best_amt THEN
        best_amt := amt;
        best := result;
      END IF;
    END IF;
  END LOOP;

  RETURN best;
END;
$$;