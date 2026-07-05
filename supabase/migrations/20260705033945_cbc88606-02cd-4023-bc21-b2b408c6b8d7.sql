
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS apply_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS banner_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_campaigns_apply_mode_chk') THEN
    ALTER TABLE public.coupon_campaigns ADD CONSTRAINT coupon_campaigns_apply_mode_chk CHECK (apply_mode IN ('manual','recommended','auto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_active_apply ON public.coupon_campaigns(is_active, status, apply_mode, priority);

CREATE TABLE IF NOT EXISTS public.coupon_recommendation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  event text NOT NULL,
  campaign_id uuid,
  coupon_code text,
  cart_snapshot jsonb,
  savings numeric,
  device text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_recommendation_log TO authenticated;
GRANT ALL ON public.coupon_recommendation_log TO service_role;
ALTER TABLE public.coupon_recommendation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers insert own recommendation log" ON public.coupon_recommendation_log;
CREATE POLICY "Customers insert own recommendation log" ON public.coupon_recommendation_log FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);
DROP POLICY IF EXISTS "Customers read own recommendation log" ON public.coupon_recommendation_log;
CREATE POLICY "Customers read own recommendation log" ON public.coupon_recommendation_log FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_coupon_reco_log_customer ON public.coupon_recommendation_log(customer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recommend_coupons_for_cart(
  _customer_id text,
  _cart_items jsonb,
  _subtotal numeric,
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL,
  _limit integer DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF v_row.code_mode = 'shared' AND v_row.shared_code IS NOT NULL THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.recommend_coupons_for_cart(text, jsonb, numeric, double precision, double precision, integer) TO authenticated, anon, service_role;
