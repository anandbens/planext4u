
-- Add daily usage cap to campaigns
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS daily_usage_limit integer;

-- Enforce daily cap inside validate_coupon_code
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
  today_used int;
  matched_product_id text;
  dist_km numeric;
BEGIN
  IF _code IS NULL OR _code = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Enter a coupon code');
  END IF;
  _code := upper(trim(_code));

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

  -- daily usage cap
  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT COUNT(*) INTO today_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id
        AND redeemed_at >= date_trunc('day', now())
        AND redeemed_at <  date_trunc('day', now()) + interval '1 day';
    IF today_used >= camp.daily_usage_limit THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Daily coupon quota reached — try again tomorrow');
    END IF;
  END IF;

  SELECT * INTO cust FROM public.customers WHERE id = _customer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Customer not found');
  END IF;

  IF camp.first_time_only THEN
    SELECT COUNT(*) INTO prior_orders FROM public.orders
      WHERE customer_id = _customer_id AND status NOT IN ('cancelled');
    IF prior_orders > 0 THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Coupon is for first-time users only');
    END IF;
  END IF;

  SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions
    WHERE campaign_id = camp.id AND customer_id = _customer_id;
  IF redemption_count >= camp.per_customer_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You have already used this coupon');
  END IF;

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

  FOR target_item IN SELECT * FROM jsonb_array_elements(_cart_items) LOOP
    IF camp.vendor_id IS NOT NULL AND (target_item->>'vendor_id') <> camp.vendor_id THEN
      CONTINUE;
    END IF;
    IF array_length(camp.vendor_ids, 1) IS NOT NULL AND array_length(camp.vendor_ids, 1) > 0 THEN
      IF NOT ((target_item->>'vendor_id') = ANY(camp.vendor_ids)) THEN
        CONTINUE;
      END IF;
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

  applied_qty := LEAST(COALESCE((eligible_product->>'qty')::int, 1), COALESCE(camp.qty_limit, 1));
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
