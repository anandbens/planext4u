
-- ============================================================
-- Coupon Redemption Engine (Prompt 6B)
-- ============================================================

-- Prevent double redemption of the same coupon code (non-rolled-back)
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_unique_active
  ON public.coupon_redemptions (coupon_code_id)
  WHERE rolled_back = false;

CREATE INDEX IF NOT EXISTS coupon_redemptions_order_idx
  ON public.coupon_redemptions (order_id);

CREATE INDEX IF NOT EXISTS coupon_redemptions_customer_idx
  ON public.coupon_redemptions (customer_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS coupon_usage_history_customer_idx
  ON public.coupon_usage_history (customer_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS coupon_usage_history_vendor_idx
  ON public.coupon_usage_history (vendor_id, redeemed_at DESC);

-- ============================================================
-- Redeem coupon for an order (idempotent, transactional)
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_order(
  p_order_id text,
  p_code text,
  p_customer_id text DEFAULT NULL,
  p_vendor_id text DEFAULT NULL,
  p_product_id text DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_order_amount numeric DEFAULT 0,
  p_payment_reference text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_require_payment_success boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row       public.coupon_codes%ROWTYPE;
  v_campaign_row   public.coupon_campaigns%ROWTYPE;
  v_order_row      public.orders%ROWTYPE;
  v_existing       public.coupon_redemptions%ROWTYPE;
  v_redemption_id  uuid;
  v_customer_mobile text;
  v_discount_pct   numeric;
  v_paid_ok        boolean := true;
BEGIN
  IF p_order_id IS NULL OR p_code IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  -- Load and LOCK the order
  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  -- Payment success check (best-effort; skip when caller opts out)
  IF p_require_payment_success THEN
    -- Consider order paid if status not in draft/pending/cancelled OR order_payments has success
    SELECT EXISTS(
      SELECT 1 FROM public.order_payments op
      WHERE op.order_id = p_order_id
        AND lower(coalesce(op.status,'')) IN ('paid','success','captured','completed')
    ) OR lower(coalesce(v_order_row.status,'')) NOT IN ('pending','draft','cancelled','failed','payment_pending','payment_failed')
    INTO v_paid_ok;

    IF NOT v_paid_ok THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_success');
    END IF;
  END IF;

  -- Lock the coupon code row
  SELECT * INTO v_code_row FROM public.coupon_codes
   WHERE code = p_code
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'coupon_not_found');
  END IF;

  -- Idempotency: existing active redemption for this coupon
  SELECT * INTO v_existing FROM public.coupon_redemptions
   WHERE coupon_code_id = v_code_row.id
     AND rolled_back = false
   LIMIT 1;
  IF FOUND THEN
    IF v_existing.order_id = p_order_id THEN
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'redemption_id', v_existing.id,
        'reason', 'already_redeemed'
      );
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'coupon_already_used_other_order');
    END IF;
  END IF;

  -- Reject if the coupon is not in a redeemable state
  IF v_code_row.status IS NOT NULL AND v_code_row.status NOT IN ('active','reserved','issued','available') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'coupon_status_' || v_code_row.status);
  END IF;

  -- Load and LOCK campaign
  SELECT * INTO v_campaign_row FROM public.coupon_campaigns
   WHERE id = v_code_row.campaign_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_not_found');
  END IF;

  -- Fetch mobile for vendor reporting
  SELECT mobile INTO v_customer_mobile
    FROM public.customers WHERE id = p_customer_id
    LIMIT 1;

  v_discount_pct := CASE
    WHEN coalesce(p_order_amount,0) > 0
      THEN round((coalesce(p_discount_amount,0) / p_order_amount) * 100, 2)
    ELSE coalesce(v_campaign_row.discount_value, 0)
  END;

  -- 1) Mark coupon code as used
  UPDATE public.coupon_codes
     SET status = 'used',
         used_by_customer_id = coalesce(p_customer_id, used_by_customer_id),
         used_by_mobile = coalesce(v_customer_mobile, used_by_mobile),
         used_order_id = p_order_id,
         used_at = now()
   WHERE id = v_code_row.id;

  -- 2) Insert redemption record
  INSERT INTO public.coupon_redemptions(
    campaign_id, coupon_code_id, code, customer_id, customer_mobile,
    order_id, product_id, discount_amount, redeemed_at
  ) VALUES (
    v_code_row.campaign_id, v_code_row.id, v_code_row.code, p_customer_id, v_customer_mobile,
    p_order_id, p_product_id, coalesce(p_discount_amount, 0), now()
  ) RETURNING id INTO v_redemption_id;

  -- 3) Insert usage history
  INSERT INTO public.coupon_usage_history(
    coupon_code_id, campaign_id, code, customer_id, order_id, vendor_id,
    discount_percent, discount_amount, order_amount,
    applied_at, redeemed_at, status,
    metadata
  ) VALUES (
    v_code_row.id, v_code_row.campaign_id, v_code_row.code, p_customer_id, p_order_id, p_vendor_id,
    v_discount_pct, coalesce(p_discount_amount,0), coalesce(p_order_amount,0),
    now(), now(), 'redeemed',
    jsonb_build_object(
      'payment_reference', p_payment_reference,
      'device', p_device,
      'ip', p_ip,
      'user_agent', p_user_agent,
      'product_id', p_product_id
    )
  );

  -- 4) Campaign totals
  UPDATE public.coupon_campaigns
     SET total_codes_used = coalesce(total_codes_used, 0) + 1,
         updated_at = now()
   WHERE id = v_code_row.campaign_id;

  -- 5) Analytics upsert
  INSERT INTO public.coupon_analytics(
    campaign_id, coupons_generated, coupons_used, coupons_expired,
    coupons_available, coupons_rolled_back, revenue, discount_given, roi, last_refreshed_at
  ) VALUES (
    v_code_row.campaign_id, 0, 1, 0, 0, 0,
    coalesce(p_order_amount,0), coalesce(p_discount_amount,0),
    CASE WHEN coalesce(p_discount_amount,0) > 0
      THEN round(coalesce(p_order_amount,0) / p_discount_amount, 4)
      ELSE 0 END,
    now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    coupons_used = coupon_analytics.coupons_used + 1,
    revenue = coupon_analytics.revenue + coalesce(p_order_amount,0),
    discount_given = coupon_analytics.discount_given + coalesce(p_discount_amount,0),
    roi = CASE WHEN (coupon_analytics.discount_given + coalesce(p_discount_amount,0)) > 0
      THEN round(
        (coupon_analytics.revenue + coalesce(p_order_amount,0)) /
        (coupon_analytics.discount_given + coalesce(p_discount_amount,0)), 4)
      ELSE 0 END,
    last_refreshed_at = now(),
    updated_at = now();

  -- 6) Sync order with coupon fields (only if not already set)
  UPDATE public.orders
     SET coupon_code = coalesce(coupon_code, v_code_row.code),
         coupon_campaign_id = coalesce(coupon_campaign_id, v_code_row.campaign_id),
         coupon_discount = greatest(coalesce(coupon_discount,0), coalesce(p_discount_amount,0)),
         coupon_snapshot = coalesce(coupon_snapshot, jsonb_build_object(
           'campaign_id', v_code_row.campaign_id,
           'campaign_name', v_campaign_row.name,
           'code', v_code_row.code,
           'discount_type', v_campaign_row.discount_type,
           'discount_value', v_campaign_row.discount_value,
           'discount_amount', coalesce(p_discount_amount,0),
           'product_id', p_product_id,
           'redeemed_at', now()
         ))
   WHERE id = p_order_id;

  -- 7) Update matching reservation (if any)
  UPDATE public.coupon_reservations
     SET status = 'redeemed',
         redeemed_at = now(),
         payment_reference = coalesce(p_payment_reference, payment_reference),
         updated_at = now()
   WHERE coupon_code_id = v_code_row.id
     AND status = 'reserved';

  -- 8) Audit log
  INSERT INTO public.coupon_audit_log(
    event_type, campaign_id, coupon_code_id, code, order_id, customer_id,
    previous_status, new_status, reason, metadata, actor, ip_address, device, user_agent
  ) VALUES (
    'redeemed', v_code_row.campaign_id, v_code_row.id, v_code_row.code, p_order_id, p_customer_id,
    v_code_row.status, 'used', 'payment_success',
    jsonb_build_object(
      'redemption_id', v_redemption_id,
      'discount_amount', p_discount_amount,
      'order_amount', p_order_amount,
      'payment_reference', p_payment_reference,
      'vendor_id', p_vendor_id,
      'product_id', p_product_id
    ),
    'system', p_ip, p_device, p_user_agent
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'redemption_id', v_redemption_id,
    'campaign_id', v_code_row.campaign_id,
    'code', v_code_row.code,
    'discount_amount', coalesce(p_discount_amount, 0)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'exception', 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_order(
  text, text, text, text, text, numeric, numeric, text, text, text, text, boolean
) TO authenticated, service_role;

-- ============================================================
-- Customer coupon history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_customer_coupon_history(
  p_customer_id text,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  redemption_id uuid,
  campaign_id uuid,
  campaign_name text,
  code text,
  order_id text,
  vendor_id text,
  product_id text,
  discount_amount numeric,
  order_amount numeric,
  redeemed_at timestamptz,
  rolled_back boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.campaign_id, c.name, r.code, r.order_id, uh.vendor_id, r.product_id,
         r.discount_amount, uh.order_amount, r.redeemed_at, r.rolled_back
    FROM public.coupon_redemptions r
    LEFT JOIN public.coupon_campaigns c ON c.id = r.campaign_id
    LEFT JOIN public.coupon_usage_history uh
           ON uh.coupon_code_id = r.coupon_code_id AND uh.order_id = r.order_id
   WHERE r.customer_id = p_customer_id
   ORDER BY r.redeemed_at DESC
   LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_coupon_history(text, int, int) TO authenticated, service_role;

-- ============================================================
-- Vendor coupon history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_vendor_coupon_history(
  p_vendor_id text,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  usage_id uuid,
  campaign_id uuid,
  campaign_name text,
  code text,
  order_id text,
  customer_id text,
  customer_mobile text,
  discount_amount numeric,
  order_amount numeric,
  redeemed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uh.id, uh.campaign_id, c.name, uh.code, uh.order_id, uh.customer_id,
         cu.mobile, uh.discount_amount, uh.order_amount, uh.redeemed_at
    FROM public.coupon_usage_history uh
    LEFT JOIN public.coupon_campaigns c ON c.id = uh.campaign_id
    LEFT JOIN public.customers cu ON cu.id = uh.customer_id
   WHERE uh.vendor_id = p_vendor_id
     AND uh.status = 'redeemed'
   ORDER BY uh.redeemed_at DESC NULLS LAST
   LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendor_coupon_history(text, int, int) TO authenticated, service_role;

-- Ensure analytics has a unique constraint on campaign_id for the upsert above
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='coupon_analytics_campaign_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.coupon_analytics
        ADD CONSTRAINT coupon_analytics_campaign_id_key UNIQUE (campaign_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;
