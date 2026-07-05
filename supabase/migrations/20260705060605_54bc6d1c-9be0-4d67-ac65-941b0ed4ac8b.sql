
-- 1. Diagnostic breakdown for admin (inline check accumulation)
CREATE OR REPLACE FUNCTION public.get_coupon_eligibility_breakdown(_campaign_id uuid, _customer_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  checks jsonb := '[]'::jsonb;
  cust RECORD;
  cust_lat double precision; cust_lng double precision;
  cust_district_ids text[];
  dist_km numeric;
  order_count int;
  redemption_count int;
  assigned_count int;
  today_used int;
  fail_count int := 0;
  ok_flag boolean; detail_text text;
BEGIN
  SELECT * INTO camp FROM public.coupon_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false, 'reason','campaign_not_found'); END IF;

  SELECT c.*, c.latitude AS lat, c.longitude AS lng INTO cust
    FROM public.customers c WHERE c.id::text = _customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false, 'reason', 'customer_not_found'); END IF;

  cust_lat := cust.lat; cust_lng := cust.lng;

  -- 1. Campaign active
  ok_flag := camp.is_active AND camp.deleted_at IS NULL
    AND (camp.status IS NULL OR camp.status NOT IN ('archived','expired','exhausted','paused'))
    AND (camp.starts_at IS NULL OR camp.starts_at <= now())
    AND (camp.expires_at IS NULL OR camp.expires_at > now());
  detail_text := format('status=%s, is_active=%s, window %s → %s', camp.status, camp.is_active, camp.starts_at, camp.expires_at);
  checks := checks || jsonb_build_array(jsonb_build_object('check','Campaign active window','ok',ok_flag,'detail',detail_text));
  IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

  -- 2. State
  IF array_length(camp.state_codes,1) > 0 THEN
    detail_text := format('Restricted to: %s', array_to_string(camp.state_codes,','));
  ELSE
    detail_text := 'No state restriction';
  END IF;
  checks := checks || jsonb_build_array(jsonb_build_object('check','State scope','ok',true,'detail',detail_text));

  -- 3. District
  SELECT COALESCE(array_agg(d.id::text), '{}') INTO cust_district_ids
    FROM public.customer_addresses ca
    JOIN public.districts d ON lower(d.name) = lower(ca.city)
    WHERE ca.customer_id = _customer_id;
  IF array_length(camp.district_ids,1) > 0 THEN
    ok_flag := cust_district_ids && camp.district_ids;
    detail_text := format('Customer districts: [%s], campaign: [%s]',
      array_to_string(cust_district_ids,','), array_to_string(camp.district_ids,','));
  ELSE
    ok_flag := true; detail_text := 'No district restriction';
  END IF;
  checks := checks || jsonb_build_array(jsonb_build_object('check','District match','ok',ok_flag,'detail',detail_text));
  IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

  -- 4. Radius
  IF camp.use_geo_radius THEN
    IF cust_lat IS NULL OR cust_lng IS NULL OR cust_lat=0 OR cust_lng=0 THEN
      ok_flag := false; detail_text := 'Customer has no coordinates on profile';
    ELSIF camp.center_lat IS NULL OR camp.center_lng IS NULL THEN
      ok_flag := false; detail_text := 'Campaign center missing';
    ELSE
      dist_km := public.haversine_distance(cust_lat, cust_lng, camp.center_lat, camp.center_lng);
      ok_flag := dist_km <= COALESCE(camp.radius_km, 5);
      detail_text := format('Customer %.2f km from center (limit %s km)', dist_km, camp.radius_km);
    END IF;
  ELSE
    ok_flag := true; detail_text := 'Not enforced';
  END IF;
  checks := checks || jsonb_build_array(jsonb_build_object('check','Geo radius','ok',ok_flag,'detail',detail_text));
  IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

  -- 5. First-time
  SELECT count(*) INTO order_count FROM public.orders
    WHERE customer_id::text = _customer_id AND status IN ('completed','delivered','paid','confirmed');
  IF camp.first_time_only THEN
    ok_flag := order_count = 0;
    detail_text := format('Prior confirmed orders: %s', order_count);
  ELSE
    ok_flag := true; detail_text := 'Not required';
  END IF;
  checks := checks || jsonb_build_array(jsonb_build_object('check','First-time user','ok',ok_flag,'detail',detail_text));
  IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

  -- 6. Per-user
  IF camp.per_customer_limit IS NOT NULL AND camp.per_customer_limit > 0 THEN
    SELECT count(*) INTO redemption_count FROM public.coupon_redemptions r
      WHERE r.campaign_id = camp.id AND r.customer_id::text = _customer_id
        AND COALESCE(r.rolled_back,false) = false;
    ok_flag := redemption_count < camp.per_customer_limit;
    detail_text := format('Used %s of %s', redemption_count, camp.per_customer_limit);
  ELSE
    ok_flag := true; detail_text := 'Unlimited';
  END IF;
  checks := checks || jsonb_build_array(jsonb_build_object('check','Per-user limit','ok',ok_flag,'detail',detail_text));
  IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

  -- 7. Daily caps
  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT count(*) INTO today_used FROM public.coupon_redemptions r
      WHERE r.campaign_id = camp.id AND r.redeemed_at >= date_trunc('day', now())
        AND COALESCE(r.rolled_back,false) = false;
    ok_flag := today_used < camp.daily_usage_limit;
    detail_text := format('%s of %s redeemed today', today_used, camp.daily_usage_limit);
    checks := checks || jsonb_build_array(jsonb_build_object('check','Daily redemption cap','ok',ok_flag,'detail',detail_text));
    IF NOT ok_flag THEN fail_count := fail_count+1; END IF;

    SELECT count(*) INTO assigned_count FROM public.coupon_customer_mapping
      WHERE campaign_id = camp.id AND assignment_date >= date_trunc('day', now()) AND deleted_at IS NULL;
    ok_flag := assigned_count < camp.daily_usage_limit;
    detail_text := format('%s of %s assigned today', assigned_count, camp.daily_usage_limit);
    checks := checks || jsonb_build_array(jsonb_build_object('check','Daily assignment cap','ok',ok_flag,'detail',detail_text));
    IF NOT ok_flag THEN fail_count := fail_count+1; END IF;
  ELSE
    checks := checks || jsonb_build_array(jsonb_build_object('check','Daily cap','ok',true,'detail','No daily cap'));
  END IF;

  -- 8. Assigned
  SELECT count(*) INTO assigned_count FROM public.coupon_customer_mapping
    WHERE campaign_id = camp.id AND customer_id = _customer_id AND deleted_at IS NULL;
  checks := checks || jsonb_build_array(jsonb_build_object(
    'check','Assigned to customer','ok', assigned_count > 0,
    'detail', CASE WHEN assigned_count > 0 THEN 'Coupon already assigned' ELSE 'Not yet assigned' END));

  RETURN jsonb_build_object(
    'found', true, 'campaign_id', camp.id, 'campaign_name', camp.name,
    'customer_id', _customer_id, 'customer_name', cust.name,
    'checks', checks, 'fail_count', fail_count,
    'overall_eligible', fail_count = 0
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_coupon_eligibility_breakdown(uuid, text) TO authenticated, service_role;

-- 2. Assignment function
CREATE OR REPLACE FUNCTION public.assign_namakkal_coupon(_customer_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  cust RECORD;
  cust_district_ids text[];
  dist_km numeric;
  passes_geo boolean := false;
  order_count int; assigned_today int; already int;
BEGIN
  SELECT * INTO camp FROM public.coupon_campaigns
   WHERE id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid OR shared_code = 'NAMAKKAL100'
   ORDER BY (id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235'::uuid) DESC
   LIMIT 1;
  IF NOT FOUND OR NOT camp.is_active THEN RETURN jsonb_build_object('ok', false, 'reason', 'campaign_inactive'); END IF;
  IF camp.expires_at IS NOT NULL AND camp.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  SELECT * INTO cust FROM public.customers WHERE id::text = _customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'customer_not_found'); END IF;

  SELECT count(*) INTO order_count FROM public.orders
    WHERE customer_id::text = _customer_id AND status IN ('completed','delivered','paid','confirmed');
  IF camp.first_time_only AND order_count > 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_first_time_user'); END IF;

  SELECT count(*) INTO already FROM public.coupon_customer_mapping
    WHERE campaign_id = camp.id AND customer_id = _customer_id AND deleted_at IS NULL;
  IF already > 0 THEN RETURN jsonb_build_object('ok', true, 'reason', 'already_assigned'); END IF;

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

  INSERT INTO public.coupon_customer_mapping (campaign_id, customer_id, assignment_date, usage_status)
    VALUES (camp.id, _customer_id, now(), 'assigned');

  RETURN jsonb_build_object('ok', true, 'reason', 'assigned', 'campaign_id', camp.id, 'code', camp.shared_code);
END $$;

GRANT EXECUTE ON FUNCTION public.assign_namakkal_coupon(text) TO authenticated, service_role;

-- 3. Trigger
CREATE OR REPLACE FUNCTION public.trg_assign_namakkal_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  BEGIN PERFORM public.assign_namakkal_coupon(NEW.id::text); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assign_namakkal_on_customer_insert ON public.customers;
CREATE TRIGGER assign_namakkal_on_customer_insert
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.trg_assign_namakkal_on_signup();

-- 4. Backfill
CREATE OR REPLACE FUNCTION public.backfill_namakkal_coupons(_days integer DEFAULT 2)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c RECORD; res jsonb; assigned int := 0; skipped int := 0;
BEGIN
  FOR c IN SELECT id FROM public.customers
    WHERE created_at > now() - (_days || ' days')::interval AND deleted_at IS NULL
  LOOP
    res := public.assign_namakkal_coupon(c.id::text);
    IF (res->>'ok')::boolean AND res->>'reason' = 'assigned' THEN assigned := assigned + 1;
    ELSE skipped := skipped + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('assigned', assigned, 'skipped', skipped);
END $$;

GRANT EXECUTE ON FUNCTION public.backfill_namakkal_coupons(integer) TO service_role, authenticated;

-- 5. Update available-coupons RPC
CREATE OR REPLACE FUNCTION public.get_customer_available_coupons(
  _customer_id text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL)
RETURNS TABLE(campaign_id uuid, name text, description text, discount_type text, discount_value numeric,
  max_discount numeric, min_order_amount numeric, vendor_id text, product_ids text[], qty_limit integer,
  expires_at timestamp with time zone, code text, code_mode text, popup_image_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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

    SELECT EXISTS(SELECT 1 FROM public.coupon_customer_mapping m
      WHERE m.campaign_id = camp.id AND m.customer_id = _customer_id AND m.deleted_at IS NULL)
    INTO assigned_match;

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

    IF camp.code_mode IN ('shared_per_customer','shared') THEN
      assigned_code := camp.shared_code;
    ELSE
      SELECT cc.code INTO assigned_code FROM public.coupon_codes cc
        WHERE cc.campaign_id = camp.id AND cc.status = 'active' LIMIT 1;
      IF assigned_code IS NULL THEN CONTINUE; END IF;
    END IF;

    campaign_id := camp.id; name := camp.name; description := camp.description;
    discount_type := camp.discount_type; discount_value := camp.discount_value;
    max_discount := camp.max_discount; min_order_amount := camp.min_order_amount;
    vendor_id := camp.vendor_id; product_ids := camp.product_ids;
    qty_limit := camp.qty_limit; expires_at := camp.expires_at;
    code := assigned_code; code_mode := camp.code_mode; popup_image_url := camp.popup_image_url;
    RETURN NEXT;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_customer_available_coupons(text, double precision, double precision) TO authenticated, anon, service_role;

-- 6. Backfill
SELECT public.backfill_namakkal_coupons(2);
