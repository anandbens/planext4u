
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS reservation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reservation_timeout_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS reservation_trigger text NOT NULL DEFAULT 'apply',
  ADD COLUMN IF NOT EXISTS release_on_payment_failure boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.coupon_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code_id uuid NULL,
  campaign_id uuid NOT NULL,
  code text NOT NULL,
  customer_id uuid NOT NULL,
  cart_id uuid NULL,
  order_id uuid NULL,
  status text NOT NULL DEFAULT 'reserved',
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz NULL,
  release_reason text NULL,
  redeemed_at timestamptz NULL,
  payment_reference text NULL,
  device text NULL,
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_reservations_status_chk
    CHECK (status IN ('reserved','redeemed','released','expired','failed'))
);

GRANT SELECT, INSERT, UPDATE ON public.coupon_reservations TO authenticated;
GRANT ALL ON public.coupon_reservations TO service_role;

ALTER TABLE public.coupon_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read own reservations" ON public.coupon_reservations;
CREATE POLICY "customers read own reservations"
  ON public.coupon_reservations
  FOR SELECT TO authenticated
  USING (customer_id::text = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "admins manage all reservations" ON public.coupon_reservations;
CREATE POLICY "admins manage all reservations"
  ON public.coupon_reservations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_coupon_res_code_active
  ON public.coupon_reservations (coupon_code_id)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_coupon_res_code_str_active
  ON public.coupon_reservations (code)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_coupon_res_customer
  ON public.coupon_reservations (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_coupon_res_expires
  ON public.coupon_reservations (expires_at)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_coupon_res_order
  ON public.coupon_reservations (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_res_active_code
  ON public.coupon_reservations (coupon_code_id)
  WHERE status = 'reserved' AND coupon_code_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_res_active_customer_campaign
  ON public.coupon_reservations (customer_id, campaign_id)
  WHERE status = 'reserved';

CREATE OR REPLACE FUNCTION public.tg_coupon_reservations_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS coupon_reservations_touch ON public.coupon_reservations;
CREATE TRIGGER coupon_reservations_touch
  BEFORE UPDATE ON public.coupon_reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_coupon_reservations_touch();

-- Reserve a coupon (transactional + row-locked)
CREATE OR REPLACE FUNCTION public.reserve_coupon(
  _customer_id uuid,
  _code text,
  _cart_id uuid DEFAULT NULL,
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL,
  _device text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_code_row record;
  v_campaign record;
  v_elig jsonb;
  v_timeout int;
  v_expires timestamptz;
  v_res_id uuid;
  v_existing record;
BEGIN
  IF _customer_id IS NULL OR _code IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  SELECT * INTO v_code_row FROM public.coupon_codes
   WHERE upper(code) = upper(_code) FOR UPDATE;

  IF v_code_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'coupon_not_found');
  END IF;

  IF COALESCE(v_code_row.status, 'available') <> 'available' THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      CASE v_code_row.status
        WHEN 'used' THEN 'coupon_already_used'
        WHEN 'reserved' THEN 'coupon_currently_reserved'
        WHEN 'expired' THEN 'coupon_expired'
        WHEN 'cancelled' THEN 'coupon_cancelled'
        ELSE 'coupon_unavailable'
      END);
  END IF;

  SELECT * INTO v_campaign FROM public.coupon_campaigns
   WHERE id = v_code_row.campaign_id FOR UPDATE;

  IF v_campaign.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_not_found');
  END IF;
  IF NOT COALESCE(v_campaign.reservation_enabled, true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_disabled');
  END IF;

  BEGIN
    SELECT public.evaluate_coupon_eligibility(
      v_campaign.id, _customer_id, NULL, NULL, _lat, _lng, NULL, NULL
    ) INTO v_elig;
  EXCEPTION WHEN OTHERS THEN
    v_elig := jsonb_build_object('eligible', true, 'reason', 'ok');
  END;

  IF NOT COALESCE((v_elig->>'eligible')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', COALESCE(v_elig->>'reason','not_eligible'));
  END IF;

  SELECT * INTO v_existing FROM public.coupon_reservations
   WHERE customer_id = _customer_id AND campaign_id = v_campaign.id
     AND status = 'reserved' LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.coupon_code_id = v_code_row.id THEN
      RETURN jsonb_build_object(
        'ok', true, 'idempotent', true,
        'reservation_id', v_existing.id, 'code', v_existing.code,
        'expires_at', v_existing.expires_at, 'reason', 'already_reserved');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'other_active_reservation');
  END IF;

  v_timeout := COALESCE(v_campaign.reservation_timeout_minutes, 15);
  v_expires := now() + make_interval(mins => v_timeout);

  INSERT INTO public.coupon_reservations
    (coupon_code_id, campaign_id, code, customer_id, cart_id, expires_at,
     device, ip_address, user_agent)
  VALUES
    (v_code_row.id, v_campaign.id, v_code_row.code, _customer_id, _cart_id,
     v_expires, _device, _ip, _user_agent)
  RETURNING id INTO v_res_id;

  UPDATE public.coupon_codes
     SET status = 'reserved', reserved_by = _customer_id, reserved_at = now(),
         reservation_expires_at = v_expires, updated_at = now()
   WHERE id = v_code_row.id;

  INSERT INTO public.coupon_audit_log
    (event_type, campaign_id, coupon_code_id, code, customer_id,
     previous_status, new_status, reason, device, ip_address, user_agent, metadata)
  VALUES
    ('reservation_created', v_campaign.id, v_code_row.id, v_code_row.code, _customer_id,
     'available', 'reserved', 'reservation_created', _device, _ip, _user_agent,
     jsonb_build_object('reservation_id', v_res_id, 'timeout_minutes', v_timeout));

  RETURN jsonb_build_object(
    'ok', true, 'reservation_id', v_res_id, 'code', v_code_row.code,
    'campaign_id', v_campaign.id, 'expires_at', v_expires, 'timeout_minutes', v_timeout);
END; $fn$;

CREATE OR REPLACE FUNCTION public.release_coupon_reservation(
  _reservation_id uuid, _customer_id uuid, _reason text DEFAULT 'released'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_res record;
BEGIN
  SELECT * INTO v_res FROM public.coupon_reservations
   WHERE id = _reservation_id FOR UPDATE;
  IF v_res.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_not_found');
  END IF;
  IF _customer_id IS NOT NULL AND v_res.customer_id <> _customer_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_reservation');
  END IF;
  IF v_res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', v_res.status);
  END IF;

  UPDATE public.coupon_reservations
     SET status = 'released', released_at = now(), release_reason = _reason
   WHERE id = _reservation_id;

  UPDATE public.coupon_codes
     SET status = 'available', reserved_by = NULL, reserved_at = NULL,
         reservation_expires_at = NULL, updated_at = now()
   WHERE id = v_res.coupon_code_id AND status = 'reserved';

  INSERT INTO public.coupon_audit_log
    (event_type, campaign_id, coupon_code_id, code, customer_id,
     previous_status, new_status, reason, metadata)
  VALUES
    ('reservation_released', v_res.campaign_id, v_res.coupon_code_id, v_res.code,
     v_res.customer_id, 'reserved', 'available', _reason,
     jsonb_build_object('reservation_id', v_res.id));
  RETURN jsonb_build_object('ok', true, 'status', 'released');
END; $fn$;

CREATE OR REPLACE FUNCTION public.redeem_coupon_reservation(
  _reservation_id uuid, _customer_id uuid, _order_id uuid,
  _payment_reference text DEFAULT NULL, _discount_amount numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_res record;
BEGIN
  SELECT * INTO v_res FROM public.coupon_reservations
   WHERE id = _reservation_id FOR UPDATE;
  IF v_res.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_not_found');
  END IF;
  IF v_res.customer_id <> _customer_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_reservation');
  END IF;
  IF v_res.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', 'redeemed');
  END IF;
  IF v_res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_not_active', 'status', v_res.status);
  END IF;
  IF v_res.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_expired');
  END IF;

  UPDATE public.coupon_reservations
     SET status = 'redeemed', redeemed_at = now(),
         order_id = _order_id, payment_reference = _payment_reference
   WHERE id = _reservation_id;

  UPDATE public.coupon_codes
     SET status = 'used', used_at = now(), used_by = _customer_id, order_id = _order_id,
         reserved_by = NULL, reserved_at = NULL, reservation_expires_at = NULL,
         updated_at = now()
   WHERE id = v_res.coupon_code_id;

  INSERT INTO public.coupon_audit_log
    (event_type, campaign_id, coupon_code_id, code, customer_id, order_id,
     previous_status, new_status, reason, metadata)
  VALUES
    ('reservation_redeemed', v_res.campaign_id, v_res.coupon_code_id, v_res.code,
     v_res.customer_id, _order_id, 'reserved', 'redeemed', 'payment_success',
     jsonb_build_object('reservation_id', v_res.id, 'payment_reference', _payment_reference,
                        'discount_amount', _discount_amount));
  RETURN jsonb_build_object('ok', true, 'status', 'redeemed');
END; $fn$;

CREATE OR REPLACE FUNCTION public.expire_coupon_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_count integer := 0; v_row record;
BEGIN
  FOR v_row IN
    SELECT id, coupon_code_id, campaign_id, code, customer_id
      FROM public.coupon_reservations
     WHERE status = 'reserved' AND expires_at < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.coupon_reservations
       SET status = 'expired', released_at = now(), release_reason = 'timeout'
     WHERE id = v_row.id;

    UPDATE public.coupon_codes
       SET status = 'available', reserved_by = NULL, reserved_at = NULL,
           reservation_expires_at = NULL, updated_at = now()
     WHERE id = v_row.coupon_code_id AND status = 'reserved';

    INSERT INTO public.coupon_audit_log
      (event_type, campaign_id, coupon_code_id, code, customer_id,
       previous_status, new_status, reason, metadata)
    VALUES
      ('reservation_expired', v_row.campaign_id, v_row.coupon_code_id, v_row.code,
       v_row.customer_id, 'reserved', 'available', 'timeout',
       jsonb_build_object('reservation_id', v_row.id));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $fn$;

CREATE OR REPLACE FUNCTION public.get_active_coupon_reservation(_customer_id uuid)
RETURNS TABLE (
  reservation_id uuid, campaign_id uuid, code text, status text,
  reserved_at timestamptz, expires_at timestamptz, seconds_remaining integer
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $fn$
  SELECT r.id, r.campaign_id, r.code, r.status, r.reserved_at, r.expires_at,
         GREATEST(0, EXTRACT(EPOCH FROM (r.expires_at - now()))::int)
    FROM public.coupon_reservations r
   WHERE r.customer_id = _customer_id AND r.status = 'reserved'
   ORDER BY r.reserved_at DESC LIMIT 1;
$fn$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-coupon-reservations') THEN
    PERFORM cron.schedule(
      'expire-coupon-reservations',
      '* * * * *',
      'SELECT public.expire_coupon_reservations();'
    );
  END IF;
END $$;
