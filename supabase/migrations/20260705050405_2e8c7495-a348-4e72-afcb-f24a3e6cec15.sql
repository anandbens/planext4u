
-- 1) Clear stray state filter on Namakkal campaign (it was 'Taraba' — a Nigerian state)
UPDATE public.coupon_campaigns
   SET state_codes = ARRAY[]::text[], updated_at = now()
 WHERE id = 'fc6e533e-60e5-472f-8db6-5cb9edf8f235';

-- 2) recommend_coupons_for_cart: treat shared_per_customer as a shared code
CREATE OR REPLACE FUNCTION public.recommend_coupons_for_cart(_customer_id text, _cart_items jsonb, _subtotal numeric, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_code text;
  v_validation jsonb;
  v_results jsonb := '[]'::jsonb;
  v_best_id uuid;
  v_best_savings numeric := 0;
  v_auto_id uuid;
BEGIN
  IF _customer_id IS NULL OR _cart_items IS NULL OR jsonb_array_length(_cart_items) = 0 THEN
    RETURN jsonb_build_object('coupons', '[]'::jsonb, 'best_campaign_id', NULL, 'auto_apply_campaign_id', NULL);
  END IF;

  FOR v_row IN
    SELECT c.id, c.name, c.description, c.discount_type, c.discount_value, c.max_discount,
           c.min_order_amount, c.expires_at, c.apply_mode, c.priority, c.banner_url, c.popup_image_url,
           c.code_mode, c.shared_code, c.exclusive, c.stackable
    FROM public.coupon_campaigns c
    WHERE c.is_active = true
      AND c.status IN ('active','running','live')
      AND c.deleted_at IS NULL
      AND (c.starts_at IS NULL OR c.starts_at <= now())
      AND (c.expires_at IS NULL OR c.expires_at >= now())
    ORDER BY c.priority ASC, c.expires_at NULLS LAST
    LIMIT 200
  LOOP
    v_code := NULL;
    IF v_row.code_mode IN ('shared','shared_per_customer') AND v_row.shared_code IS NOT NULL THEN
      v_code := v_row.shared_code;
    ELSE
      SELECT code INTO v_code
      FROM public.coupon_codes
      WHERE campaign_id = v_row.id
        AND status = 'active'
        AND (assigned_customer_id IS NULL OR assigned_customer_id::text = _customer_id)
        AND (expires_at IS NULL OR expires_at >= now())
        AND used_by_customer_id IS NULL
      ORDER BY assigned_customer_id NULLS LAST, created_at ASC
      LIMIT 1;
    END IF;
    CONTINUE WHEN v_code IS NULL;

    BEGIN
      v_validation := public.validate_coupon_code(v_code, _customer_id, _cart_items, _subtotal, _lat, _lng);
    EXCEPTION WHEN OTHERS THEN
      v_validation := jsonb_build_object('valid', false, 'reason', SQLERRM);
    END;

    IF COALESCE((v_validation->>'valid')::boolean, false) THEN
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'campaign_id', v_row.id,
        'campaign_name', v_row.name,
        'description', v_row.description,
        'code', v_code,
        'discount_type', v_row.discount_type,
        'discount_value', v_row.discount_value,
        'max_discount', v_row.max_discount,
        'min_order_amount', v_row.min_order_amount,
        'expires_at', v_row.expires_at,
        'apply_mode', v_row.apply_mode,
        'priority', v_row.priority,
        'banner_url', COALESCE(v_row.banner_url, v_row.popup_image_url),
        'exclusive', v_row.exclusive,
        'stackable', v_row.stackable,
        'discount_amount', COALESCE((v_validation->>'discount_amount')::numeric, 0),
        'product_id', v_validation->>'product_id',
        'validation', v_validation
      ));
      IF COALESCE((v_validation->>'discount_amount')::numeric, 0) > v_best_savings THEN
        v_best_savings := (v_validation->>'discount_amount')::numeric;
        v_best_id := v_row.id;
      END IF;
      IF v_row.apply_mode = 'auto' AND v_auto_id IS NULL THEN
        v_auto_id := v_row.id;
      END IF;
    END IF;
  END LOOP;

  SELECT jsonb_agg(elem ORDER BY (elem->>'discount_amount')::numeric DESC,
                                 (elem->>'priority')::int ASC,
                                 (elem->>'expires_at')::timestamptz ASC NULLS LAST)
    INTO v_results
  FROM jsonb_array_elements(v_results) elem;

  v_results := COALESCE(v_results, '[]'::jsonb);
  IF jsonb_array_length(v_results) > _limit THEN
    SELECT jsonb_agg(e) INTO v_results
    FROM (SELECT e FROM jsonb_array_elements(v_results) e LIMIT _limit) sub;
  END IF;

  RETURN jsonb_build_object(
    'coupons', v_results,
    'best_campaign_id', v_best_id,
    'auto_apply_campaign_id', v_auto_id
  );
END;
$function$;

-- 3) redeem_coupon_code: enforce daily_usage_limit for shared campaigns
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

  -- Daily usage limit
  IF camp.daily_usage_limit IS NOT NULL AND camp.daily_usage_limit > 0 THEN
    SELECT COUNT(*) INTO today_used FROM public.coupon_redemptions
      WHERE campaign_id = camp.id
        AND created_at >= date_trunc('day', now())
        AND created_at <  date_trunc('day', now()) + interval '1 day';
    IF today_used >= camp.daily_usage_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Daily coupon limit reached. Please try tomorrow.');
    END IF;
  END IF;

  -- Per-customer limit
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
