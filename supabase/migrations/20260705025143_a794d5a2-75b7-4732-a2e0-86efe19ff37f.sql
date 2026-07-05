
-- ============================================================
-- 1. Extend campaign schema with richer eligibility fields
-- ============================================================
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS state_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS city_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pincodes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vendor_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vendor_category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS customer_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS customer_segments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_order_amount numeric,
  ADD COLUMN IF NOT EXISTS min_qty integer,
  ADD COLUMN IF NOT EXISTS max_qty integer,
  ADD COLUMN IF NOT EXISTS min_orders integer,
  ADD COLUMN IF NOT EXISTS max_orders integer,
  ADD COLUMN IF NOT EXISTS min_lifetime_spend numeric,
  ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusive boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cc_vendor_ids_idx     ON public.coupon_campaigns USING gin (vendor_ids);
CREATE INDEX IF NOT EXISTS cc_district_ids_idx   ON public.coupon_campaigns USING gin (district_ids);
CREATE INDEX IF NOT EXISTS cc_state_codes_idx    ON public.coupon_campaigns USING gin (state_codes);
CREATE INDEX IF NOT EXISTS cc_customer_ids_idx   ON public.coupon_campaigns USING gin (customer_ids);
CREATE INDEX IF NOT EXISTS cc_category_ids_idx   ON public.coupon_campaigns USING gin (category_ids);

-- ============================================================
-- 2. Reusable Eligibility Engine
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_coupon_eligibility(
  _campaign_id uuid,
  _customer_id text  DEFAULT NULL,
  _vendor_id   uuid  DEFAULT NULL,
  _product_ids uuid[] DEFAULT NULL,
  _lat         double precision DEFAULT NULL,
  _lng         double precision DEFAULT NULL,
  _cart_value  numeric DEFAULT NULL,
  _quantity    integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Lifecycle
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

  -- Cart value
  IF _cart_value IS NOT NULL THEN
    IF camp.min_order_amount IS NOT NULL AND _cart_value < camp.min_order_amount THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_order',
        'min_order_amount', camp.min_order_amount);
    END IF;
    IF camp.max_order_amount IS NOT NULL AND _cart_value > camp.max_order_amount THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'above_max_order',
        'max_order_amount', camp.max_order_amount);
    END IF;
  END IF;

  -- Quantity
  IF _quantity IS NOT NULL THEN
    IF camp.min_qty IS NOT NULL AND _quantity < camp.min_qty THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'below_min_qty');
    END IF;
    IF camp.max_qty IS NOT NULL AND _quantity > camp.max_qty THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'above_max_qty');
    END IF;
  END IF;

  -- Vendor scope
  IF _vendor_id IS NOT NULL THEN
    SELECT category_id, (SELECT name FROM public.districts d
                        JOIN public.cities ci ON ci.id = v.city_id
                        WHERE d.name = ci.state LIMIT 1), state_name
      INTO vendor_cat, vendor_district, vendor_state
      FROM public.vendors v WHERE v.id = _vendor_id;

    IF camp.vendor_id IS NOT NULL AND camp.vendor_id::text <> _vendor_id::text THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_not_allowed');
    END IF;
    IF array_length(camp.vendor_ids, 1) > 0 AND NOT (_vendor_id = ANY(camp.vendor_ids)) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_not_in_list');
    END IF;
    IF array_length(camp.vendor_category_ids, 1) > 0
       AND (vendor_cat IS NULL OR NOT (vendor_cat = ANY(camp.vendor_category_ids))) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'vendor_category_not_allowed');
    END IF;
    matched := matched || jsonb_build_object('vendor_id', _vendor_id);
  END IF;

  -- Product scope
  IF _product_ids IS NOT NULL AND array_length(_product_ids, 1) > 0 THEN
    IF array_length(camp.product_ids, 1) > 0
       AND NOT (_product_ids && camp.product_ids) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'no_eligible_product');
    END IF;
    IF array_length(camp.category_ids, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = ANY(_product_ids) AND p.category_id = ANY(camp.category_ids)
      ) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'no_eligible_category');
      END IF;
    END IF;
  END IF;

  -- Location: state / city / pincode / district
  IF _vendor_id IS NOT NULL THEN
    IF array_length(camp.state_codes, 1) > 0
       AND (vendor_state IS NULL OR NOT (vendor_state = ANY(camp.state_codes))) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'state_not_allowed');
    END IF;
  END IF;

  -- Radius (haversine)
  IF camp.use_geo_radius AND _lat IS NOT NULL AND _lng IS NOT NULL
     AND camp.center_lat IS NOT NULL AND camp.center_lng IS NOT NULL THEN
    dist_km := 6371 * 2 * asin(
      sqrt(
        power(sin(radians((camp.center_lat - _lat)/2)), 2) +
        cos(radians(_lat)) * cos(radians(camp.center_lat)) *
        power(sin(radians((camp.center_lng - _lng)/2)), 2)
      )
    );
    IF dist_km > COALESCE(camp.radius_km, 5) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'outside_radius',
        'distance_km', round(dist_km::numeric, 2), 'radius_km', camp.radius_km);
    END IF;
    matched := matched || jsonb_build_object('distance_km', round(dist_km::numeric, 2));
  END IF;

  -- Customer eligibility
  IF _customer_id IS NOT NULL THEN
    IF array_length(camp.customer_ids, 1) > 0 AND NOT (_customer_id = ANY(camp.customer_ids)) THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'customer_not_in_list');
    END IF;

    SELECT id, created_at, referred_by INTO cust
      FROM public.customers WHERE id::text = _customer_id LIMIT 1;

    IF array_length(camp.customer_segments, 1) > 0 THEN
      IF 'referral' = ANY(camp.customer_segments) AND cust.referred_by IS NULL THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'not_referral_customer');
      END IF;
    END IF;

    -- Order count / lifetime spend / first-time
    SELECT count(*)::int, COALESCE(sum(total_amount), 0)
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

    -- Per-customer redemption limit
    IF camp.per_customer_limit IS NOT NULL AND camp.per_customer_limit > 0 THEN
      IF (SELECT count(*) FROM public.coupon_redemptions r
          WHERE r.campaign_id = camp.id AND r.customer_id::text = _customer_id
            AND r.status IN ('applied','redeemed')) >= camp.per_customer_limit THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'per_customer_limit_reached');
      END IF;
    END IF;
  ELSIF camp.first_time_only OR array_length(camp.customer_ids, 1) > 0 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'customer_required');
  END IF;

  RETURN jsonb_build_object('eligible', true, 'reason', 'ok', 'matched', matched);
END $$;

GRANT EXECUTE ON FUNCTION public.evaluate_coupon_eligibility(uuid, text, uuid, uuid[], double precision, double precision, numeric, integer) TO anon, authenticated;

-- ============================================================
-- 3. Audit trigger for eligibility-rule changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_audit_campaign_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
  cols text[] := ARRAY[
    'vendor_id','vendor_ids','vendor_category_ids','product_ids','category_ids',
    'district_ids','state_codes','city_ids','pincodes',
    'use_geo_radius','radius_km','center_lat','center_lng',
    'customer_ids','customer_segments','first_time_only',
    'min_order_amount','max_order_amount','min_qty','max_qty',
    'min_orders','max_orders','min_lifetime_spend'
  ];
  c text;
  before_v jsonb; after_v jsonb;
BEGIN
  FOREACH c IN ARRAY cols LOOP
    EXECUTE format('SELECT to_jsonb($1.%I), to_jsonb($2.%I)', c, c)
      INTO before_v, after_v USING OLD, NEW;
    IF before_v IS DISTINCT FROM after_v THEN
      changed := changed || jsonb_build_object(c, jsonb_build_object('old', before_v, 'new', after_v));
    END IF;
  END LOOP;
  IF changed <> '{}'::jsonb THEN
    INSERT INTO public.coupon_audit_log (event_type, campaign_id, actor, metadata, reason)
    VALUES ('eligibility_updated', NEW.id, COALESCE(auth.uid()::text,'system'), changed, 'campaign eligibility rules changed');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS coupon_campaigns_eligibility_audit ON public.coupon_campaigns;
CREATE TRIGGER coupon_campaigns_eligibility_audit
AFTER UPDATE ON public.coupon_campaigns
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_campaign_eligibility();
