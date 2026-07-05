CREATE OR REPLACE FUNCTION public.get_customer_available_coupons(_customer_id text, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision)
 RETURNS TABLE(campaign_id uuid, name text, description text, discount_type text, discount_value numeric, max_discount numeric, min_order_amount numeric, vendor_id text, product_ids text[], qty_limit integer, expires_at timestamp with time zone, code text, code_mode text, popup_image_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT COALESCE(array_agg(d.id), '{}') INTO cust_district_ids
  FROM public.customer_addresses ca
  JOIN public.districts d ON lower(d.name) = lower(ca.city)
  WHERE ca.customer_id = _customer_id;

  FOR camp IN
    SELECT * FROM public.coupon_campaigns cc
     WHERE cc.is_active = true
       AND cc.starts_at <= now()
       AND (cc.expires_at IS NULL OR cc.expires_at > now())
  LOOP
    IF camp.first_time_only THEN
      SELECT COUNT(*) INTO prior_orders FROM public.orders o
        WHERE o.customer_id = _customer_id AND o.status NOT IN ('cancelled');
      IF prior_orders > 0 THEN CONTINUE; END IF;
    END IF;

    SELECT COUNT(*) INTO redemption_count FROM public.coupon_redemptions r
      WHERE r.campaign_id = camp.id AND r.customer_id = _customer_id;
    IF redemption_count >= camp.per_customer_limit THEN CONTINUE; END IF;

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

    IF camp.code_mode = 'shared_per_customer' THEN
      assigned_code := camp.shared_code;
    ELSE
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
END; $function$;

CREATE OR REPLACE FUNCTION public.redeem_coupon_code(_code text, _customer_id text, _order_id text, _product_id text, _discount_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  code_row public.coupon_codes%ROWTYPE;
  cust_mobile text;
  today_used int;
  cust_used int;
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

  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT COUNT(*) INTO today_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id
        AND redeemed_at >= date_trunc('day', now())
        AND redeemed_at <  date_trunc('day', now()) + interval '1 day';
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
END; $function$;