
UPDATE public.coupon_campaigns
SET code_mode = 'unique_single_use',
    shared_code = NULL,
    updated_at = now()
WHERE id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid;

CREATE OR REPLACE FUNCTION public.assign_namakkal_coupon(_customer_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  cust RECORD;
  cust_district_ids text[];
  dist_km numeric;
  passes_geo boolean := false;
  order_count int; assigned_today int; already int;
  existing_code text;
  reserved_id uuid; reserved_code text;
BEGIN
  SELECT * INTO camp FROM public.coupon_campaigns
   WHERE id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid LIMIT 1;
  IF NOT FOUND OR NOT camp.is_active THEN RETURN jsonb_build_object('ok', false, 'reason', 'campaign_inactive'); END IF;
  IF camp.expires_at IS NOT NULL AND camp.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  SELECT * INTO cust FROM public.customers WHERE id::text = _customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'customer_not_found'); END IF;

  SELECT count(*) INTO order_count FROM public.orders
    WHERE customer_id::text = _customer_id AND status IN ('completed','delivered','paid','confirmed');
  IF camp.first_time_only AND order_count > 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_first_time_user'); END IF;

  SELECT cc.code INTO existing_code
    FROM public.coupon_customer_mapping m
    LEFT JOIN public.coupon_codes cc ON cc.id = m.coupon_code_id
   WHERE m.campaign_id = camp.id AND m.customer_id = _customer_id AND m.deleted_at IS NULL
   LIMIT 1;
  IF existing_code IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_assigned', 'campaign_id', camp.id, 'code', existing_code);
  END IF;
  SELECT count(*) INTO already FROM public.coupon_customer_mapping
    WHERE campaign_id = camp.id AND customer_id = _customer_id AND deleted_at IS NULL;

  IF cust.latitude IS NOT NULL AND cust.longitude IS NOT NULL AND cust.latitude <> 0 AND cust.longitude <> 0
     AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
    dist_km := public.haversine_distance(cust.latitude, cust.longitude, camp.center_lat, camp.center_lng);
    IF dist_km <= COALESCE(camp.radius_km, 25) THEN passes_geo := true; END IF;
  END IF;
  IF NOT passes_geo THEN
    SELECT COALESCE(array_agg(d.id::text), '{}') INTO cust_district_ids
      FROM public.customer_addresses ca
      JOIN public.districts d ON lower(d.name) = lower(ca.city)
      WHERE ca.customer_id = _customer_id;
    IF cust_district_ids && camp.district_ids THEN passes_geo := true; END IF;
  END IF;
  IF NOT passes_geo THEN RETURN jsonb_build_object('ok', false, 'reason', 'outside_namakkal'); END IF;

  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT count(*) INTO assigned_today FROM public.coupon_customer_mapping
      WHERE campaign_id = camp.id AND assignment_date >= date_trunc('day', now()) AND deleted_at IS NULL;
    IF assigned_today >= camp.daily_usage_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'daily_cap_reached', 'cap', camp.daily_usage_limit);
    END IF;
  END IF;

  UPDATE public.coupon_codes
     SET assigned_customer_id = _customer_id, updated_at = now()
   WHERE id = (
     SELECT id FROM public.coupon_codes
      WHERE campaign_id = camp.id AND status = 'active'
        AND assigned_customer_id IS NULL AND deleted_at IS NULL
      ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1
   )
  RETURNING id, code INTO reserved_id, reserved_code;

  IF reserved_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inventory_exhausted');
  END IF;

  IF already > 0 THEN
    UPDATE public.coupon_customer_mapping
       SET coupon_code_id = reserved_id, updated_at = now()
     WHERE campaign_id = camp.id AND customer_id = _customer_id AND deleted_at IS NULL AND coupon_code_id IS NULL;
  ELSE
    INSERT INTO public.coupon_customer_mapping (campaign_id, customer_id, coupon_code_id, assignment_date, usage_status)
      VALUES (camp.id, _customer_id, reserved_id, now(), 'assigned');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'assigned', 'campaign_id', camp.id, 'code', reserved_code);
END $function$;

CREATE OR REPLACE FUNCTION public.get_customer_available_coupons(_customer_id text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL)
 RETURNS TABLE(campaign_id uuid, name text, description text, discount_type text, discount_value numeric, max_discount numeric, min_order_amount numeric, vendor_id text, product_ids text[], qty_limit integer, expires_at timestamp with time zone, code text, code_mode text, popup_image_url text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  camp record; cust_district_ids text[];
  fallback_lat double precision; fallback_lng double precision;
  eff_lat double precision; eff_lng double precision;
  addr_match boolean; radius_match boolean; assigned_match boolean;
  prior_orders int; redemption_count int; today_used int;
  assigned_code text; dist_km numeric;
BEGIN
  SELECT COALESCE(array_agg(d.id::text), '{}') INTO cust_district_ids
    FROM public.customer_addresses ca
    JOIN public.districts d ON lower(d.name) = lower(ca.city)
    WHERE ca.customer_id = _customer_id;

  SELECT c.latitude, c.longitude INTO fallback_lat, fallback_lng FROM public.customers c WHERE c.id::text = _customer_id;
  eff_lat := COALESCE(_lat, fallback_lat);
  eff_lng := COALESCE(_lng, fallback_lng);

  FOR camp IN
    SELECT * FROM public.coupon_campaigns cc
     WHERE cc.is_active = true AND cc.starts_at <= now()
       AND (cc.expires_at IS NULL OR cc.expires_at > now())
       AND cc.deleted_at IS NULL
  LOOP
    IF camp.first_time_only THEN
      SELECT COUNT(*) INTO prior_orders FROM public.orders o
        WHERE o.customer_id::text = _customer_id AND o.status IN ('completed','delivered','paid','confirmed');
      IF prior_orders > 0 THEN CONTINUE; END IF;
    END IF;

    SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions r
      WHERE r.campaign_id = camp.id AND r.customer_id::text = _customer_id
        AND COALESCE(r.rolled_back, false) = false;
    IF camp.per_customer_limit IS NOT NULL AND redemption_count >= camp.per_customer_limit THEN CONTINUE; END IF;

    IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
      SELECT count(*) INTO today_used FROM public.coupon_redemptions r
        WHERE r.campaign_id = camp.id AND r.redeemed_at >= date_trunc('day', now())
          AND COALESCE(r.rolled_back, false) = false;
      IF today_used >= camp.daily_usage_limit THEN CONTINUE; END IF;
    END IF;

    assigned_code := NULL;
    SELECT cc.code INTO assigned_code
      FROM public.coupon_customer_mapping m
      JOIN public.coupon_codes cc ON cc.id = m.coupon_code_id
     WHERE m.campaign_id = camp.id AND m.customer_id = _customer_id AND m.deleted_at IS NULL
       AND cc.status = 'active'
     LIMIT 1;
    assigned_match := assigned_code IS NOT NULL;

    IF NOT assigned_match AND array_length(camp.district_ids, 1) > 0 THEN
      addr_match := (cust_district_ids && camp.district_ids);
      radius_match := false;
      IF camp.use_geo_radius AND eff_lat IS NOT NULL AND eff_lng IS NOT NULL
         AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL
         AND eff_lat <> 0 AND eff_lng <> 0 THEN
        dist_km := public.haversine_distance(eff_lat, eff_lng, camp.center_lat, camp.center_lng);
        IF dist_km <= COALESCE(camp.radius_km, 5) THEN radius_match := true; END IF;
      END IF;
      IF NOT addr_match AND NOT radius_match THEN CONTINUE; END IF;
    END IF;

    IF assigned_code IS NULL THEN
      IF camp.code_mode = 'shared_per_customer' AND camp.shared_code IS NOT NULL THEN
        assigned_code := camp.shared_code;
      ELSE
        SELECT cc.code INTO assigned_code FROM public.coupon_codes cc
          WHERE cc.campaign_id = camp.id AND cc.status = 'active' AND cc.assigned_customer_id IS NULL
          LIMIT 1;
        IF assigned_code IS NULL THEN CONTINUE; END IF;
      END IF;
    END IF;

    campaign_id := camp.id; name := camp.name; description := camp.description;
    discount_type := camp.discount_type; discount_value := camp.discount_value;
    max_discount := camp.max_discount; min_order_amount := camp.min_order_amount;
    vendor_id := camp.vendor_id; product_ids := camp.product_ids;
    qty_limit := camp.qty_limit; expires_at := camp.expires_at;
    code := assigned_code; code_mode := camp.code_mode; popup_image_url := camp.popup_image_url;
    RETURN NEXT;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.validate_coupon_code(_code text, _customer_id text, _cart_items jsonb, _subtotal numeric, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  code_row public.coupon_codes%ROWTYPE;
  cust public.customers%ROWTYPE;
  addr_match boolean := false; radius_match boolean := false;
  eligible_product jsonb; target_item jsonb;
  applied_qty int := 0; unit_price numeric := 0; discount numeric := 0;
  prior_orders int; redemption_count int; today_used int;
  matched_product_id text; dist_km numeric;
BEGIN
  IF _code IS NULL OR _code = '' THEN RETURN jsonb_build_object('valid', false, 'reason', 'Enter a coupon code'); END IF;
  _code := upper(trim(_code));

  SELECT * INTO camp FROM public.coupon_campaigns
    WHERE shared_code IS NOT NULL AND upper(shared_code) = _code AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO code_row FROM public.coupon_codes WHERE upper(code) = _code LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'Invalid coupon'); END IF;
    IF code_row.status <> 'active' THEN RETURN jsonb_build_object('valid', false, 'reason', 'Coupon already used or expired'); END IF;
    IF code_row.assigned_customer_id IS NOT NULL AND code_row.assigned_customer_id <> _customer_id THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'This coupon is assigned to another customer');
    END IF;
    SELECT * INTO camp FROM public.coupon_campaigns WHERE id = code_row.campaign_id;
  END IF;

  IF NOT camp.is_active THEN RETURN jsonb_build_object('valid', false, 'reason', 'Campaign inactive'); END IF;
  IF camp.starts_at > now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not yet active'); END IF;
  IF camp.expires_at IS NOT NULL AND camp.expires_at < now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'Coupon expired'); END IF;
  IF _subtotal < camp.min_order_amount THEN RETURN jsonb_build_object('valid', false, 'reason', 'Minimum order ' || camp.min_order_amount || ' required'); END IF;

  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT COUNT(*) INTO today_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id AND redeemed_at >= date_trunc('day', now()) AND redeemed_at <  date_trunc('day', now()) + interval '1 day';
    IF today_used >= camp.daily_usage_limit THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Daily coupon quota reached — try again tomorrow');
    END IF;
  END IF;

  SELECT * INTO cust FROM public.customers WHERE id = _customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'Customer not found'); END IF;

  IF camp.first_time_only THEN
    SELECT COUNT(*) INTO prior_orders FROM public.orders WHERE customer_id = _customer_id AND status NOT IN ('cancelled');
    IF prior_orders > 0 THEN RETURN jsonb_build_object('valid', false, 'reason', 'Coupon is for first-time users only'); END IF;
  END IF;

  SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions WHERE campaign_id = camp.id AND customer_id = _customer_id;
  IF camp.per_customer_limit IS NOT NULL AND redemption_count >= camp.per_customer_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You have already used this coupon');
  END IF;

  IF array_length(camp.district_ids, 1) IS NOT NULL AND array_length(camp.district_ids, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.customer_addresses ca
      JOIN public.districts d ON lower(d.name) = lower(ca.city)
      WHERE ca.customer_id = _customer_id AND d.id::text = ANY(camp.district_ids)
    ) INTO addr_match;

    IF camp.use_geo_radius AND _lat IS NOT NULL AND _lng IS NOT NULL AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
      dist_km := public.haversine_distance(_lat, _lng, camp.center_lat, camp.center_lng);
      IF dist_km <= COALESCE(camp.radius_km, 0) THEN radius_match := true; END IF;
    END IF;

    IF NOT addr_match AND NOT radius_match THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Coupon not valid in your location');
    END IF;
  END IF;

  FOR target_item IN SELECT * FROM jsonb_array_elements(_cart_items) LOOP
    IF camp.vendor_id IS NOT NULL AND (target_item->>'vendor_id') <> camp.vendor_id THEN CONTINUE; END IF;
    IF array_length(camp.vendor_ids, 1) IS NOT NULL AND array_length(camp.vendor_ids, 1) > 0 THEN
      IF NOT ((target_item->>'vendor_id') = ANY(camp.vendor_ids)) THEN CONTINUE; END IF;
    END IF;
    IF array_length(camp.product_ids, 1) IS NOT NULL AND array_length(camp.product_ids, 1) > 0 THEN
      IF NOT ((target_item->>'id') = ANY(camp.product_ids)) THEN CONTINUE; END IF;
    END IF;
    eligible_product := target_item;
    matched_product_id := target_item->>'id';
    EXIT;
  END LOOP;

  IF eligible_product IS NULL THEN
    IF (camp.product_ids IS NULL OR array_length(camp.product_ids,1) IS NULL)
       AND (camp.vendor_id IS NULL)
       AND (camp.vendor_ids IS NULL OR array_length(camp.vendor_ids,1) IS NULL) THEN
      IF camp.discount_type = 'percent' THEN
        discount := round(_subtotal * camp.discount_value / 100.0, 2);
        IF camp.max_discount IS NOT NULL AND discount > camp.max_discount THEN discount := camp.max_discount; END IF;
      ELSE
        discount := LEAST(camp.discount_value, _subtotal);
      END IF;
      IF discount <= 0 THEN RETURN jsonb_build_object('valid', false, 'reason', 'Discount could not be applied'); END IF;
      RETURN jsonb_build_object(
        'valid', true, 'campaign_id', camp.id, 'code', _code, 'discount_amount', discount,
        'discount_type', camp.discount_type, 'discount_value', camp.discount_value,
        'product_id', NULL, 'qty_applied', 1, 'vendor_id', camp.vendor_id,
        'name', camp.name, 'blocks_points', true
      );
    END IF;
    RETURN jsonb_build_object('valid', false, 'reason', 'No matching product in cart for this coupon');
  END IF;

  applied_qty := LEAST(COALESCE((eligible_product->>'qty')::int, 1), COALESCE(camp.qty_limit, 1));
  unit_price := COALESCE((eligible_product->>'price')::numeric, 0);
  IF camp.discount_type = 'percent' THEN
    discount := round(unit_price * applied_qty * camp.discount_value / 100.0, 2);
    IF camp.max_discount IS NOT NULL AND discount > camp.max_discount THEN discount := camp.max_discount; END IF;
  ELSE
    discount := LEAST(camp.discount_value, unit_price * applied_qty);
  END IF;

  IF discount <= 0 THEN RETURN jsonb_build_object('valid', false, 'reason', 'Discount could not be applied'); END IF;

  RETURN jsonb_build_object(
    'valid', true, 'campaign_id', camp.id, 'code', _code, 'discount_amount', discount,
    'discount_type', camp.discount_type, 'discount_value', camp.discount_value,
    'product_id', matched_product_id, 'qty_applied', applied_qty, 'vendor_id', camp.vendor_id,
    'name', camp.name, 'blocks_points', true
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.redeem_coupon_code(_code text, _customer_id text, _order_id text, _product_id text, _discount_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  code_row public.coupon_codes%ROWTYPE;
  cust_mobile text; today_used int; cust_used int; order_exists boolean;
BEGIN
  _code := upper(trim(_code));

  SELECT EXISTS(SELECT 1 FROM public.orders WHERE id = _order_id) INTO order_exists;
  IF NOT order_exists THEN RETURN jsonb_build_object('ok', false, 'reason', 'Order not found'); END IF;

  SELECT * INTO camp FROM public.coupon_campaigns
    WHERE shared_code IS NOT NULL AND upper(shared_code) = _code AND is_active = true LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO code_row FROM public.coupon_codes WHERE upper(code) = _code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Invalid coupon'); END IF;
    IF code_row.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason', 'Coupon already used'); END IF;
    IF code_row.assigned_customer_id IS NOT NULL AND code_row.assigned_customer_id <> _customer_id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Coupon not assigned to this customer');
    END IF;
    SELECT * INTO camp FROM public.coupon_campaigns WHERE id = code_row.campaign_id;
  END IF;

  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT COUNT(*) INTO today_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id AND redeemed_at >= date_trunc('day', now()) AND redeemed_at <  date_trunc('day', now()) + interval '1 day';
    IF today_used >= camp.daily_usage_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Daily coupon limit reached. Please try tomorrow.');
    END IF;
  END IF;

  IF camp.per_customer_limit IS NOT NULL AND camp.per_customer_limit > 0 THEN
    SELECT COUNT(*) INTO cust_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id AND customer_id = _customer_id;
    IF cust_used >= camp.per_customer_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'You have already used this coupon');
    END IF;
  END IF;

  SELECT mobile INTO cust_mobile FROM public.customers WHERE id = _customer_id;

  INSERT INTO public.coupon_redemptions
    (campaign_id, coupon_code_id, code, customer_id, customer_mobile, order_id, product_id, discount_amount)
  VALUES (camp.id, code_row.id, _code, _customer_id, cust_mobile, _order_id, _product_id, _discount_amount)
  ON CONFLICT (campaign_id, customer_id, order_id) DO NOTHING;

  IF code_row.id IS NOT NULL THEN
    UPDATE public.coupon_codes
      SET status = 'used', used_by_customer_id = _customer_id, used_by_mobile = cust_mobile,
          used_order_id = _order_id, used_at = now()
      WHERE id = code_row.id AND status = 'active';

    UPDATE public.coupon_customer_mapping
      SET usage_status = 'used', updated_at = now()
      WHERE coupon_code_id = code_row.id AND customer_id = _customer_id;
  END IF;

  UPDATE public.coupon_campaigns SET total_codes_used = total_codes_used + 1, updated_at = now() WHERE id = camp.id;

  RETURN jsonb_build_object('ok', true, 'campaign_id', camp.id);
END; $function$;

-- Backfill existing Namakkal mappings without a code
DO $$
DECLARE
  m RECORD; reserved_id uuid;
BEGIN
  FOR m IN
    SELECT id, customer_id FROM public.coupon_customer_mapping
     WHERE campaign_id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid
       AND deleted_at IS NULL AND coupon_code_id IS NULL
  LOOP
    UPDATE public.coupon_codes
       SET assigned_customer_id = m.customer_id, updated_at = now()
     WHERE id = (
       SELECT id FROM public.coupon_codes
        WHERE campaign_id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid
          AND status = 'active' AND assigned_customer_id IS NULL AND deleted_at IS NULL
        ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1
     )
    RETURNING id INTO reserved_id;

    IF reserved_id IS NOT NULL THEN
      UPDATE public.coupon_customer_mapping SET coupon_code_id = reserved_id, updated_at = now() WHERE id = m.id;
    END IF;
  END LOOP;
END $$;
