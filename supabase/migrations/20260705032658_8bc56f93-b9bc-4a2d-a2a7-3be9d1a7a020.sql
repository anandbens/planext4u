
-- ============================================================
-- Coupon Rollback Engine (Prompt 7A)
-- ============================================================

CREATE INDEX IF NOT EXISTS coupon_rollback_history_order_idx
  ON public.coupon_rollback_history(order_id);
CREATE INDEX IF NOT EXISTS coupon_rollback_history_campaign_idx
  ON public.coupon_rollback_history(campaign_id, rolled_back_at DESC);

-- ============================================================
-- Evaluate rollback eligibility (read-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_coupon_rollback(
  p_order_id text,
  p_event text,           -- payment_failed|cancelled|refunded|partial_refund|reservation_release
  p_product_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_red public.coupon_redemptions%ROWTYPE;
  v_code public.coupon_codes%ROWTYPE;
  v_camp public.coupon_campaigns%ROWTYPE;
  v_policy text;
  v_window int;
  v_age_min numeric;
  v_allow boolean := false;
  v_reason text := 'not_evaluated';
BEGIN
  SELECT * INTO v_red FROM public.coupon_redemptions
   WHERE order_id = p_order_id AND rolled_back = false
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_redemption');
  END IF;

  SELECT * INTO v_code FROM public.coupon_codes WHERE id = v_red.coupon_code_id;
  SELECT * INTO v_camp FROM public.coupon_campaigns WHERE id = v_red.campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_missing');
  END IF;

  v_policy := coalesce(v_camp.rollback_policy, 'never');
  v_window := coalesce(v_camp.rollback_window_minutes, 0);
  v_age_min := extract(epoch FROM (now() - v_red.redeemed_at)) / 60.0;

  IF v_policy = 'never' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'policy_never', 'policy', v_policy);
  END IF;

  -- Product-scope check for partial refunds
  IF p_event = 'partial_refund'
     AND p_product_id IS NOT NULL
     AND v_red.product_id IS NOT NULL
     AND v_red.product_id <> p_product_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'product_mismatch');
  END IF;

  -- Policy evaluation
  IF v_policy = 'always' THEN v_allow := true; v_reason := 'policy_always';
  ELSIF v_policy = 'on_payment_failure' AND p_event = 'payment_failed' THEN v_allow := true; v_reason := 'payment_failed';
  ELSIF v_policy = 'on_cancellation' AND p_event IN ('cancelled','payment_failed') THEN v_allow := true; v_reason := 'cancellation';
  ELSIF v_policy = 'on_full_refund' AND p_event = 'refunded' THEN v_allow := true; v_reason := 'full_refund';
  ELSIF v_policy = 'on_partial_refund' AND p_event = 'partial_refund' THEN v_allow := true; v_reason := 'partial_refund';
  ELSIF v_policy = 'on_refund' AND p_event IN ('refunded','partial_refund') THEN v_allow := true; v_reason := 'refund';
  ELSIF v_policy = 'before_vendor_accept' AND p_event = 'cancelled' THEN
    v_allow := true; v_reason := 'before_vendor_accept';
  ELSIF v_policy = 'within_window' THEN v_allow := true; v_reason := 'within_window';
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'policy_mismatch', 'policy', v_policy, 'event', p_event);
  END IF;

  IF v_window > 0 AND v_age_min > v_window THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_expired',
      'age_minutes', v_age_min, 'window_minutes', v_window);
  END IF;

  -- Coupon must not be permanently disabled
  IF v_code.status NOT IN ('used','active','reserved') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'code_status_' || v_code.status);
  END IF;

  IF v_camp.expires_at IS NOT NULL AND v_camp.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_expired');
  END IF;
  IF coalesce(v_camp.status,'active') NOT IN ('active','draft','scheduled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_inactive');
  END IF;

  RETURN jsonb_build_object(
    'ok', v_allow, 'reason', v_reason,
    'policy', v_policy, 'window_minutes', v_window,
    'age_minutes', v_age_min,
    'campaign_id', v_camp.id,
    'coupon_code_id', v_code.id,
    'code', v_code.code,
    'discount_amount', v_red.discount_amount,
    'product_id', v_red.product_id
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.evaluate_coupon_rollback(text,text,text) TO authenticated, service_role;

-- ============================================================
-- Rollback a coupon (transactional, idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_coupon_for_order(
  p_order_id text,
  p_event text,
  p_reason text DEFAULT NULL,
  p_refund_id text DEFAULT NULL,
  p_product_id text DEFAULT NULL,
  p_actor text DEFAULT 'system',
  p_ip text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_force boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_red public.coupon_redemptions%ROWTYPE;
  v_code public.coupon_codes%ROWTYPE;
  v_camp public.coupon_campaigns%ROWTYPE;
  v_eval jsonb;
  v_history_id uuid;
  v_old_status text;
BEGIN
  IF p_order_id IS NULL OR p_event IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  -- Lock the redemption row
  SELECT * INTO v_red FROM public.coupon_redemptions
    WHERE order_id = p_order_id AND rolled_back = false
    FOR UPDATE LIMIT 1;

  IF NOT FOUND THEN
    -- Idempotent: already rolled back?
    SELECT * INTO v_red FROM public.coupon_redemptions
     WHERE order_id = p_order_id AND rolled_back = true LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'reason', 'already_rolled_back');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_redemption');
  END IF;

  -- Evaluate policy (unless force)
  IF NOT p_force THEN
    v_eval := public.evaluate_coupon_rollback(p_order_id, p_event, p_product_id);
    IF NOT coalesce((v_eval->>'ok')::boolean, false) THEN
      -- Audit the blocked attempt
      INSERT INTO public.coupon_audit_log(event_type, campaign_id, coupon_code_id, code, order_id,
        customer_id, previous_status, new_status, reason, metadata, actor, ip_address, device, user_agent)
      VALUES ('rollback_blocked', v_red.campaign_id, v_red.coupon_code_id, v_red.code, p_order_id,
        v_red.customer_id, 'used', 'used', coalesce(v_eval->>'reason','policy_denied'),
        v_eval || jsonb_build_object('event', p_event, 'product_id', p_product_id),
        p_actor, p_ip, p_device, p_user_agent);
      RETURN v_eval;
    END IF;
  END IF;

  -- Lock code and campaign
  SELECT * INTO v_code FROM public.coupon_codes WHERE id = v_red.coupon_code_id FOR UPDATE;
  SELECT * INTO v_camp FROM public.coupon_campaigns WHERE id = v_red.campaign_id FOR UPDATE;

  v_old_status := v_code.status;

  -- 1) Restore coupon code
  UPDATE public.coupon_codes
     SET status = 'active',
         used_by_customer_id = NULL,
         used_by_mobile = NULL,
         used_order_id = NULL,
         used_at = NULL
   WHERE id = v_code.id;

  -- 2) Mark redemption rolled back
  UPDATE public.coupon_redemptions
     SET rolled_back = true,
         rolled_back_at = now(),
         rollback_reason = coalesce(p_reason, p_event),
         rollback_event = p_event,
         rolled_back_by = p_actor
   WHERE id = v_red.id;

  -- 3) Update usage history
  UPDATE public.coupon_usage_history
     SET status = 'rolled_back',
         metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
           'rollback_event', p_event,
           'rollback_reason', p_reason,
           'rolled_back_at', now()
         ),
         updated_at = now()
   WHERE coupon_code_id = v_code.id AND order_id = p_order_id;

  -- 4) Campaign totals
  UPDATE public.coupon_campaigns
     SET total_codes_used = greatest(coalesce(total_codes_used,0) - 1, 0),
         updated_at = now()
   WHERE id = v_camp.id;

  -- 5) Analytics
  UPDATE public.coupon_analytics
     SET coupons_used = greatest(coalesce(coupons_used,0) - 1, 0),
         coupons_rolled_back = coalesce(coupons_rolled_back,0) + 1,
         revenue = greatest(coalesce(revenue,0) - coalesce(v_red.discount_amount,0) * 0, 0), -- revenue subtract handled by refund pipeline
         discount_given = greatest(coalesce(discount_given,0) - coalesce(v_red.discount_amount,0), 0),
         last_refreshed_at = now(),
         updated_at = now()
   WHERE campaign_id = v_camp.id;

  -- 6) Release matching reservation (if still around)
  UPDATE public.coupon_reservations
     SET status = 'released',
         released_at = now(),
         release_reason = 'rollback:' || p_event,
         updated_at = now()
   WHERE coupon_code_id = v_code.id
     AND status IN ('reserved','redeemed');

  -- 7) Clear order coupon fields (keep coupon_snapshot for history)
  UPDATE public.orders
     SET coupon_discount = 0,
         coupon_snapshot = coalesce(coupon_snapshot,'{}'::jsonb) || jsonb_build_object(
           'rolled_back', true,
           'rollback_event', p_event,
           'rollback_reason', p_reason,
           'rolled_back_at', now()
         )
   WHERE id = p_order_id;

  -- 8) Rollback history record
  INSERT INTO public.coupon_rollback_history(
    coupon_code_id, campaign_id, code, order_id, refund_id,
    old_status, new_status, rollback_reason, rolled_back_by, rolled_back_at, metadata
  ) VALUES (
    v_code.id, v_camp.id, v_code.code, p_order_id, p_refund_id,
    v_old_status, 'active', coalesce(p_reason, p_event), p_actor, now(),
    jsonb_build_object(
      'event', p_event, 'product_id', p_product_id,
      'discount_amount', v_red.discount_amount,
      'customer_id', v_red.customer_id,
      'ip', p_ip, 'device', p_device, 'user_agent', p_user_agent
    )
  ) RETURNING id INTO v_history_id;

  -- 9) Audit log
  INSERT INTO public.coupon_audit_log(
    event_type, campaign_id, coupon_code_id, code, order_id, customer_id,
    previous_status, new_status, reason, metadata, actor, ip_address, device, user_agent
  ) VALUES (
    'rolled_back', v_camp.id, v_code.id, v_code.code, p_order_id, v_red.customer_id,
    v_old_status, 'active', coalesce(p_reason, p_event),
    jsonb_build_object(
      'history_id', v_history_id, 'event', p_event,
      'refund_id', p_refund_id, 'product_id', p_product_id,
      'discount_amount', v_red.discount_amount, 'forced', p_force
    ),
    p_actor, p_ip, p_device, p_user_agent
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'rollback_id', v_history_id,
    'campaign_id', v_camp.id,
    'code', v_code.code,
    'restored_status', 'active'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'exception', 'error', SQLERRM);
END; $$;
GRANT EXECUTE ON FUNCTION public.rollback_coupon_for_order(text,text,text,text,text,text,text,text,text,boolean) TO authenticated, service_role;

-- ============================================================
-- Customer rollback history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_customer_rollback_history(
  p_customer_id text, p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS TABLE(
  rollback_id uuid, campaign_id uuid, campaign_name text, code text,
  order_id text, refund_id text, old_status text, new_status text,
  rollback_reason text, rolled_back_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.campaign_id, c.name, h.code, h.order_id, h.refund_id,
         h.old_status, h.new_status, h.rollback_reason, h.rolled_back_at
    FROM public.coupon_rollback_history h
    LEFT JOIN public.coupon_campaigns c ON c.id = h.campaign_id
   WHERE (h.metadata->>'customer_id') = p_customer_id
   ORDER BY h.rolled_back_at DESC
   LIMIT p_limit OFFSET p_offset;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_rollback_history(text,int,int) TO authenticated, service_role;

-- ============================================================
-- Vendor rollback history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_vendor_rollback_history(
  p_vendor_id text, p_limit int DEFAULT 100, p_offset int DEFAULT 0
) RETURNS TABLE(
  rollback_id uuid, campaign_id uuid, campaign_name text, code text,
  order_id text, customer_id text, old_status text, new_status text,
  rollback_reason text, rolled_back_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.campaign_id, c.name, h.code, h.order_id,
         h.metadata->>'customer_id', h.old_status, h.new_status,
         h.rollback_reason, h.rolled_back_at
    FROM public.coupon_rollback_history h
    JOIN public.orders o ON o.id = h.order_id
    LEFT JOIN public.coupon_campaigns c ON c.id = h.campaign_id
   WHERE o.vendor_id = p_vendor_id
   ORDER BY h.rolled_back_at DESC NULLS LAST
   LIMIT p_limit OFFSET p_offset;
$$;
GRANT EXECUTE ON FUNCTION public.get_vendor_rollback_history(text,int,int) TO authenticated, service_role;

-- ============================================================
-- Automatic rollback on order cancellation trigger
-- (Best-effort: fires only when payment failure/cancel matches policy.
-- Uses SECURITY DEFINER RPC internally; no-op when no coupon on order.)
-- ============================================================
CREATE OR REPLACE FUNCTION public._auto_rollback_on_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
BEGIN
  IF NEW.coupon_code IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_event := CASE
    WHEN lower(NEW.status) IN ('cancelled','canceled') THEN 'cancelled'
    WHEN lower(NEW.status) IN ('payment_failed','failed') THEN 'payment_failed'
    WHEN lower(NEW.status) IN ('refunded','refund_completed') THEN 'refunded'
    ELSE NULL
  END;

  IF v_event IS NOT NULL THEN
    PERFORM public.rollback_coupon_for_order(
      NEW.id, v_event, 'order_status_change:' || NEW.status,
      NULL, NULL, 'system:trigger', NULL, NULL, NULL, false);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_auto_coupon_rollback ON public.orders;
CREATE TRIGGER orders_auto_coupon_rollback
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public._auto_rollback_on_order_status();
