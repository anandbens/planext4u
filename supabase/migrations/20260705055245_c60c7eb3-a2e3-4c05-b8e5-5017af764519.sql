CREATE OR REPLACE FUNCTION public.evaluate_coupon_eligibility(_campaign_id uuid, _customer_id text DEFAULT NULL::text, _vendor_id uuid DEFAULT NULL::uuid, _product_ids uuid[] DEFAULT NULL::uuid[], _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _cart_value numeric DEFAULT NULL::numeric, _quantity integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  camp public.coupon_campaigns%ROWTYPE;
  v_row RECORD;
  cust  RECORD;
  order_count int;
  lifetime_spend numeric;
  dist_km numeric;
  vendor_cat uuid;
  vendor_district text;
  vendor_state text;
  matched jsonb := '{}'::jsonb;
  reason text;
BEGIN
  SELECT * INTO camp FROM public.coupon_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_not_found');
  END IF;

  IF camp.deleted_at IS NOT NULL OR camp.status IN ('archived','expired','exhausted','paused')
     OR camp.is_active = false THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_inactive');
  END IF;
  IF camp.starts_at IS NOT NULL AND camp.starts_at > now() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_yet_started');
  END IF;
  IF camp.expires_at IS NOT NULL AND camp.expires_at < now() THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_expired');
  END IF;
  IF camp.total_codes_target IS NOT NULL AND camp.total_codes_target > 0
     AND camp.total_codes_used >= camp.total_codes_target THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'campaign_exhausted');
  END IF;

  IF _cart_value IS NOT NULL THEN
    IF camp.min_order_amount IS NOT NULL AND _cart_value < camp.min_order_amount THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_order', 'min_order_amount', camp.min_order_amount);
    END IF;
    IF camp.max_order_amount IS NOT NULL AND _cart_value > camp.max_order_amount THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'above_max_order', 'max_order_amount', camp.max_order_amount);
    END IF;
  END IF;

  IF _quantity IS NOT NULL THEN
    IF camp.min_qty IS NOT NULL AND _quantity < camp.min_qty THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_qty');
    END IF;
    IF camp.max_qty IS NOT NULL AND _quantity > camp.max_qty THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'above_max_qty');
    END IF;
  END IF;

  IF _vendor_id IS NOT NULL THEN
    SELECT category_id, (SELECT name FROM public.districts d JOIN public.cities ci ON ci.id = v.city_id WHERE d.name = ci.state LIMIT 1), state_name
      INTO vendor_cat, vendor_district, vendor_state
      FROM public.vendors v WHERE v.id = _vendor_id;
    IF camp.vendor_id IS NOT NULL AND camp.vendor_id::text <> _vendor_id::text THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_not_allowed');
    END IF;
    IF array_length(camp.vendor_ids, 1) > 0 AND NOT (_vendor_id = ANY(camp.vendor_ids)) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_not_in_list');
    END IF;
    IF array_length(camp.vendor_category_ids, 1) > 0 AND (vendor_cat IS NULL OR NOT (vendor_cat = ANY(camp.vendor_category_ids))) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_category_not_allowed');
    END IF;
    matched := matched || jsonb_build_object('vendor_id', _vendor_id);
  END IF;

  IF _product_ids IS NOT NULL AND array_length(_product_ids, 1) > 0 THEN
    IF array_length(camp.product_ids, 1) > 0 AND NOT (_product_ids && camp.product_ids) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'no_eligible_product');
    END IF;
    IF array_length(camp.category_ids, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = ANY(_product_ids) AND p.category_id = ANY(camp.category_ids)) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'no_eligible_category');
      END IF;
    END IF;
  END IF;

  IF _vendor_id IS NOT NULL THEN
    IF array_length(camp.state_codes, 1) > 0 AND (vendor_state IS NULL OR NOT (vendor_state = ANY(camp.state_codes))) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'state_not_allowed');
    END IF;
  END IF;

  IF camp.use_geo_radius AND _lat IS NOT NULL AND _lng IS NOT NULL AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
    dist_km := 6371 * 2 * asin(sqrt(power(sin(radians((camp.center_lat - _lat)/2)), 2) + cos(radians(_lat)) * cos(radians(camp.center_lat)) * power(sin(radians((camp.center_lng - _lng)/2)), 2)));
    IF dist_km > COALESCE(camp.radius_km, 5) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'outside_radius', 'distance_km', round(dist_km::numeric, 2), 'radius_km', camp.radius_km);
    END IF;
    matched := matched || jsonb_build_object('distance_km', round(dist_km::numeric, 2));
  END IF;

  IF _customer_id IS NOT NULL THEN
    IF array_length(camp.customer_ids, 1) > 0 AND NOT (_customer_id = ANY(camp.customer_ids)) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'customer_not_in_list');
    END IF;

    SELECT id, created_at, referred_by INTO cust FROM public.customers WHERE id::text = _customer_id LIMIT 1;

    IF array_length(camp.customer_segments, 1) > 0 THEN
      IF 'referral' = ANY(camp.customer_segments) AND cust.referred_by IS NULL THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'not_referral_customer');
      END IF;
    END IF;

    -- FIX: orders.total (not total_amount)
    SELECT count(*)::int, COALESCE(sum(total), 0)
      INTO order_count, lifetime_spend
      FROM public.orders
      WHERE customer_id::text = _customer_id
        AND status IN ('completed','delivered','paid','confirmed');

    IF camp.first_time_only AND order_count > 0 THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'not_first_time_user');
    END IF;
    IF camp.min_orders IS NOT NULL AND order_count < camp.min_orders THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_orders');
    END IF;
    IF camp.max_orders IS NOT NULL AND order_count > camp.max_orders THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'above_max_orders');
    END IF;
    IF camp.min_lifetime_spend IS NOT NULL AND lifetime_spend < camp.min_lifetime_spend THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_lifetime_spend');
    END IF;

    IF camp.per_customer_limit IS NOT NULL AND camp.per_customer_limit > 0 THEN
      IF (SELECT count(*) FROM public.coupon_redemptions r WHERE r.campaign_id = camp.id AND r.customer_id::text = _customer_id AND r.status IN ('applied','redeemed')) >= camp.per_customer_limit THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'per_customer_limit_reached');
      END IF;
    END IF;
  ELSIF camp.first_time_only OR array_length(camp.customer_ids, 1) > 0 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'customer_required');
  END IF;

  RETURN jsonb_build_object('eligible', true, 'reason', 'ok', 'matched', matched);
END $function$;