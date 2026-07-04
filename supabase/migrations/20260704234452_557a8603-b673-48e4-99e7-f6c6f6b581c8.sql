
-- 1. Extend coupon_campaigns
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS rollback_policy text NOT NULL DEFAULT 'always_restore',
  ADD COLUMN IF NOT EXISTS rollback_window_minutes integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Validate rollback_policy values via trigger (avoid CHECK on mutable rules)
CREATE OR REPLACE FUNCTION public.validate_coupon_campaign_policy()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rollback_policy NOT IN (
    'never','always_restore','before_payment','payment_failed',
    'before_vendor_accept','before_shipment','refund_approved',
    'full_cancellation_only','partial_if_coupon_product'
  ) THEN
    RAISE EXCEPTION 'Invalid rollback_policy: %', NEW.rollback_policy;
  END IF;
  IF NEW.status NOT IN ('active','expired','exhausted','disabled') THEN
    RAISE EXCEPTION 'Invalid campaign status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_coupon_campaign_policy ON public.coupon_campaigns;
CREATE TRIGGER trg_validate_coupon_campaign_policy
  BEFORE INSERT OR UPDATE ON public.coupon_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.validate_coupon_campaign_policy();

-- 2. Extend coupon_redemptions with rollback fields
ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS rolled_back boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz,
  ADD COLUMN IF NOT EXISTS rollback_reason text,
  ADD COLUMN IF NOT EXISTS rollback_event text,
  ADD COLUMN IF NOT EXISTS rolled_back_by text;

-- 3. Audit log
CREATE TABLE IF NOT EXISTS public.coupon_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  campaign_id uuid,
  coupon_code_id uuid,
  code text,
  order_id text,
  customer_id text,
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_audit_log TO authenticated;
GRANT ALL ON public.coupon_audit_log TO service_role;
ALTER TABLE public.coupon_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_audit_admin_read" ON public.coupon_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_coupon_audit_campaign ON public.coupon_audit_log(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_audit_order ON public.coupon_audit_log(order_id);

-- 4. Rollback RPC
CREATE OR REPLACE FUNCTION public.rollback_coupon_for_order(
  p_order_id text,
  p_event text,
  p_reason text DEFAULT NULL,
  p_actor text DEFAULT 'system'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_red public.coupon_redemptions%ROWTYPE;
  v_camp public.coupon_campaigns%ROWTYPE;
  v_policy text;
  v_window_min integer;
  v_allowed boolean := false;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_red FROM public.coupon_redemptions
    WHERE order_id = p_order_id AND rolled_back = false
    ORDER BY redeemed_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('rolled_back', false, 'reason', 'no_active_redemption');
  END IF;

  SELECT * INTO v_camp FROM public.coupon_campaigns WHERE id = v_red.campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('rolled_back', false, 'reason', 'campaign_missing');
  END IF;

  v_policy := COALESCE(v_camp.rollback_policy, 'never');
  v_window_min := v_camp.rollback_window_minutes;

  -- Policy gate
  IF v_policy = 'never' THEN
    v_allowed := false;
  ELSIF v_policy = 'always_restore' THEN
    v_allowed := true;
  ELSIF v_policy = 'payment_failed' AND p_event = 'payment_failed' THEN
    v_allowed := true;
  ELSIF v_policy = 'before_payment' AND p_event IN ('cancelled_before_payment','payment_failed') THEN
    v_allowed := true;
  ELSIF v_policy = 'before_vendor_accept' AND p_event IN ('cancelled_before_payment','payment_failed','cancelled_before_accept') THEN
    v_allowed := true;
  ELSIF v_policy = 'before_shipment' AND p_event IN ('cancelled_before_payment','payment_failed','cancelled_before_accept','cancelled_before_shipment') THEN
    v_allowed := true;
  ELSIF v_policy = 'refund_approved' AND p_event IN ('refund_approved','payment_failed','cancelled_before_payment') THEN
    v_allowed := true;
  ELSIF v_policy = 'full_cancellation_only' AND p_event IN ('cancelled_full','payment_failed') THEN
    v_allowed := true;
  END IF;

  -- Window check
  IF v_allowed AND v_window_min IS NOT NULL THEN
    IF v_red.redeemed_at + make_interval(mins => v_window_min) < v_now THEN
      v_allowed := false;
    END IF;
  END IF;

  -- Do not restore if campaign expired or disabled
  IF v_allowed THEN
    IF v_camp.status <> 'active' OR (v_camp.expires_at IS NOT NULL AND v_camp.expires_at < v_now) THEN
      v_allowed := false;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    INSERT INTO public.coupon_audit_log(event_type, campaign_id, coupon_code_id, code, order_id, customer_id, previous_status, new_status, reason, actor)
    VALUES ('rollback_denied', v_red.campaign_id, v_red.coupon_code_id, v_red.code, v_red.order_id, v_red.customer_id, 'used', 'used', COALESCE(p_reason, p_event), p_actor);
    RETURN jsonb_build_object('rolled_back', false, 'reason', 'policy_denied', 'policy', v_policy);
  END IF;

  -- Perform rollback
  UPDATE public.coupon_codes
     SET status = 'available',
         used_by_customer_id = NULL,
         used_by_mobile = NULL,
         used_order_id = NULL,
         used_at = NULL
   WHERE id = v_red.coupon_code_id;

  UPDATE public.coupon_redemptions
     SET rolled_back = true,
         rolled_back_at = v_now,
         rollback_reason = p_reason,
         rollback_event = p_event,
         rolled_back_by = p_actor
   WHERE id = v_red.id;

  UPDATE public.coupon_campaigns
     SET total_codes_used = GREATEST(COALESCE(total_codes_used,0) - 1, 0)
   WHERE id = v_red.campaign_id;

  INSERT INTO public.coupon_audit_log(event_type, campaign_id, coupon_code_id, code, order_id, customer_id, previous_status, new_status, reason, actor, metadata)
  VALUES ('rollback_success', v_red.campaign_id, v_red.coupon_code_id, v_red.code, v_red.order_id, v_red.customer_id, 'used', 'available', COALESCE(p_reason, p_event), p_actor,
          jsonb_build_object('policy', v_policy, 'event', p_event));

  RETURN jsonb_build_object('rolled_back', true, 'code', v_red.code, 'policy', v_policy);
END; $$;

GRANT EXECUTE ON FUNCTION public.rollback_coupon_for_order(text,text,text,text) TO authenticated, service_role;

-- 5. Trigger on orders → auto rollback on cancel/refund/failed
CREATE OR REPLACE FUNCTION public.orders_coupon_rollback_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
BEGIN
  IF NEW.coupon_code IS NULL OR NEW.coupon_code = '' THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  v_event := CASE lower(COALESCE(NEW.status,''))
    WHEN 'cancelled' THEN 'cancelled_full'
    WHEN 'canceled' THEN 'cancelled_full'
    WHEN 'refunded' THEN 'refund_approved'
    WHEN 'payment_failed' THEN 'payment_failed'
    WHEN 'failed' THEN 'payment_failed'
    WHEN 'returned' THEN 'refund_approved'
    ELSE NULL END;

  IF v_event IS NULL THEN RETURN NEW; END IF;

  PERFORM public.rollback_coupon_for_order(NEW.id, v_event, 'order_status_change:' || NEW.status, 'trigger:orders');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_coupon_rollback ON public.orders;
CREATE TRIGGER trg_orders_coupon_rollback
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_coupon_rollback_trigger();

-- 6. Auto-expiry scheduler function
CREATE OR REPLACE FUNCTION public.expire_coupons_and_campaigns()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expired_campaigns int := 0;
  v_expired_codes int := 0;
  v_exhausted int := 0;
  v_now timestamptz := now();
BEGIN
  -- Expire campaigns past end date
  WITH upd AS (
    UPDATE public.coupon_campaigns
       SET status = 'expired', is_active = false, updated_at = v_now
     WHERE expires_at IS NOT NULL
       AND expires_at < v_now
       AND status = 'active'
     RETURNING id
  ) SELECT count(*) INTO v_expired_campaigns FROM upd;

  -- Expire unused codes for expired/disabled campaigns
  WITH upd AS (
    UPDATE public.coupon_codes cc
       SET status = 'expired'
      FROM public.coupon_campaigns c
     WHERE cc.campaign_id = c.id
       AND cc.status = 'available'
       AND (c.status <> 'active' OR (c.expires_at IS NOT NULL AND c.expires_at < v_now))
     RETURNING cc.id
  ) SELECT count(*) INTO v_expired_codes FROM upd;

  -- Exhaust campaigns whose qty_limit is met
  WITH upd AS (
    UPDATE public.coupon_campaigns
       SET status = 'exhausted', is_active = false, updated_at = v_now
     WHERE status = 'active'
       AND qty_limit IS NOT NULL
       AND qty_limit > 0
       AND COALESCE(total_codes_used,0) >= qty_limit
     RETURNING id
  ) SELECT count(*) INTO v_exhausted FROM upd;

  INSERT INTO public.coupon_audit_log(event_type, reason, metadata, actor)
  VALUES ('scheduler_run', 'expire_coupons_and_campaigns',
          jsonb_build_object('expired_campaigns', v_expired_campaigns, 'expired_codes', v_expired_codes, 'exhausted', v_exhausted),
          'scheduler');

  RETURN jsonb_build_object(
    'expired_campaigns', v_expired_campaigns,
    'expired_codes', v_expired_codes,
    'exhausted_campaigns', v_exhausted,
    'ran_at', v_now
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.expire_coupons_and_campaigns() TO authenticated, service_role;

-- Enable pg_cron & schedule every 15 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'coupon_expiry_scheduler') THEN
    PERFORM cron.unschedule('coupon_expiry_scheduler');
  END IF;
  PERFORM cron.schedule(
    'coupon_expiry_scheduler',
    '*/15 * * * *',
    $CRON$ SELECT public.expire_coupons_and_campaigns(); $CRON$
  );
END $$;
