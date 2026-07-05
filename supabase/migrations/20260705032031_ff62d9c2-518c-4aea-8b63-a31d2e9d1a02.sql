
-- ============================================================
-- Fraud Detection Engine (Prompt 8)
-- ============================================================

-- ---------- Rules ----------
CREATE TABLE IF NOT EXISTS public.fraud_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  severity text NOT NULL DEFAULT 'medium',
  action text NOT NULL DEFAULT 'warn',
  score int NOT NULL DEFAULT 10,
  threshold int NOT NULL DEFAULT 1,
  window_seconds int NOT NULL DEFAULT 3600,
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fraud_rules TO authenticated;
GRANT ALL ON public.fraud_rules TO service_role;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_rules read" ON public.fraud_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "fraud_rules admin write" ON public.fraud_rules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Blacklist ----------
CREATE TABLE IF NOT EXISTS public.fraud_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_value text NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'manual',
  severity text NOT NULL DEFAULT 'high',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fraud_blacklist_unique ON public.fraud_blacklist(entity_type, entity_value);
CREATE INDEX IF NOT EXISTS fraud_blacklist_type_idx ON public.fraud_blacklist(entity_type);
GRANT SELECT ON public.fraud_blacklist TO authenticated;
GRANT ALL ON public.fraud_blacklist TO service_role;
ALTER TABLE public.fraud_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_blacklist admin all" ON public.fraud_blacklist
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Device fingerprints ----------
CREATE TABLE IF NOT EXISTS public.fraud_device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  customer_id text,
  mobile text,
  device_model text, os_name text, os_version text, app_version text, browser text,
  ip_address text, screen text, timezone text, language text, hardware_id text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  seen_count int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fraud_fingerprint_customer_uidx
  ON public.fraud_device_fingerprints(fingerprint, coalesce(customer_id,''));
CREATE INDEX IF NOT EXISTS fraud_fingerprint_idx ON public.fraud_device_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS fraud_fingerprint_customer_idx ON public.fraud_device_fingerprints(customer_id);
GRANT SELECT, INSERT, UPDATE ON public.fraud_device_fingerprints TO authenticated;
GRANT ALL ON public.fraud_device_fingerprints TO service_role;
ALTER TABLE public.fraud_device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp read" ON public.fraud_device_fingerprints
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid()::text OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fp insert" ON public.fraud_device_fingerprints
  FOR INSERT TO authenticated
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid()::text);
CREATE POLICY "fp update" ON public.fraud_device_fingerprints
  FOR UPDATE TO authenticated
  USING (customer_id IS NULL OR customer_id = auth.uid()::text OR public.has_role(auth.uid(),'admin'));

-- ---------- Evaluations ----------
CREATE TABLE IF NOT EXISTS public.fraud_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  customer_id text, mobile text, device_fingerprint text, ip_address text,
  campaign_id uuid, code text, order_id text,
  lat double precision, lng double precision,
  score int NOT NULL DEFAULT 0,
  action text NOT NULL DEFAULT 'allow',
  matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fraud_eval_customer_idx ON public.fraud_evaluations(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_eval_device_idx ON public.fraud_evaluations(device_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_eval_event_idx ON public.fraud_evaluations(event, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_eval_campaign_idx ON public.fraud_evaluations(campaign_id, created_at DESC);
GRANT SELECT, INSERT ON public.fraud_evaluations TO authenticated;
GRANT ALL ON public.fraud_evaluations TO service_role;
ALTER TABLE public.fraud_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval admin read" ON public.fraud_evaluations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "eval insert" ON public.fraud_evaluations FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- Alerts ----------
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES public.fraud_evaluations(id) ON DELETE SET NULL,
  event text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  score int NOT NULL DEFAULT 0,
  customer_id text, mobile text, device_fingerprint text, ip_address text,
  campaign_id uuid, code text, order_id text,
  title text NOT NULL, description text,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid, resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fraud_alerts_status_idx ON public.fraud_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_alerts_severity_idx ON public.fraud_alerts(severity, created_at DESC);
GRANT SELECT, UPDATE ON public.fraud_alerts TO authenticated;
GRANT ALL ON public.fraud_alerts TO service_role;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts admin all" ON public.fraud_alerts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Rate limits ----------
CREATE TABLE IF NOT EXISTS public.fraud_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_seconds int NOT NULL DEFAULT 60,
  hits int NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fraud_rate_unique ON public.fraud_rate_limits(action, key);
GRANT SELECT ON public.fraud_rate_limits TO authenticated;
GRANT ALL ON public.fraud_rate_limits TO service_role;
ALTER TABLE public.fraud_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate admin read" ON public.fraud_rate_limits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public._fraud_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS fraud_rules_touch ON public.fraud_rules;
CREATE TRIGGER fraud_rules_touch BEFORE UPDATE ON public.fraud_rules
FOR EACH ROW EXECUTE FUNCTION public._fraud_touch_updated_at();

DROP TRIGGER IF EXISTS fraud_bl_touch ON public.fraud_blacklist;
CREATE TRIGGER fraud_bl_touch BEFORE UPDATE ON public.fraud_blacklist
FOR EACH ROW EXECUTE FUNCTION public._fraud_touch_updated_at();

DROP TRIGGER IF EXISTS fraud_fp_touch ON public.fraud_device_fingerprints;
CREATE TRIGGER fraud_fp_touch BEFORE UPDATE ON public.fraud_device_fingerprints
FOR EACH ROW EXECUTE FUNCTION public._fraud_touch_updated_at();

DROP TRIGGER IF EXISTS fraud_alerts_touch ON public.fraud_alerts;
CREATE TRIGGER fraud_alerts_touch BEFORE UPDATE ON public.fraud_alerts
FOR EACH ROW EXECUTE FUNCTION public._fraud_touch_updated_at();

-- ============================================================
-- Blacklist helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.fraud_blacklist_check(
  p_entity_type text, p_entity_value text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.fraud_blacklist
     WHERE entity_type = p_entity_type
       AND entity_value = p_entity_value
       AND (expires_at IS NULL OR expires_at > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.fraud_blacklist_check(text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fraud_blacklist_add(
  p_entity_type text, p_entity_value text,
  p_reason text DEFAULT NULL, p_source text DEFAULT 'manual',
  p_severity text DEFAULT 'high', p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.fraud_blacklist(entity_type,entity_value,reason,source,severity,expires_at,metadata,created_by)
  VALUES (p_entity_type,p_entity_value,p_reason,p_source,p_severity,p_expires_at,coalesce(p_metadata,'{}'::jsonb),auth.uid())
  ON CONFLICT (entity_type, entity_value) DO UPDATE
     SET reason=EXCLUDED.reason, severity=EXCLUDED.severity,
         expires_at=EXCLUDED.expires_at, metadata=EXCLUDED.metadata, updated_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fraud_blacklist_add(text,text,text,text,text,timestamptz,jsonb) TO authenticated, service_role;

-- ============================================================
-- Rate limit hit
-- ============================================================
CREATE OR REPLACE FUNCTION public.fraud_rate_limit_hit(
  p_action text, p_key text, p_max int, p_window_seconds int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.fraud_rate_limits%ROWTYPE; v_now timestamptz := now();
BEGIN
  INSERT INTO public.fraud_rate_limits(action,key,window_start,window_seconds,hits)
  VALUES (p_action,p_key,v_now,p_window_seconds,1)
  ON CONFLICT (action,key) DO UPDATE
     SET hits = CASE WHEN public.fraud_rate_limits.window_start + (public.fraud_rate_limits.window_seconds || ' seconds')::interval < v_now THEN 1
                     ELSE public.fraud_rate_limits.hits + 1 END,
         window_start = CASE WHEN public.fraud_rate_limits.window_start + (public.fraud_rate_limits.window_seconds || ' seconds')::interval < v_now THEN v_now
                             ELSE public.fraud_rate_limits.window_start END,
         window_seconds = p_window_seconds,
         updated_at = v_now
  RETURNING * INTO v_row;

  IF v_row.hits > p_max THEN
    UPDATE public.fraud_rate_limits SET blocked_until = v_row.window_start + (p_window_seconds||' seconds')::interval WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'blocked', true, 'hits', v_row.hits, 'max', p_max);
  END IF;
  RETURN jsonb_build_object('ok', true, 'blocked', false, 'hits', v_row.hits, 'max', p_max);
END; $$;
GRANT EXECUTE ON FUNCTION public.fraud_rate_limit_hit(text,text,int,int) TO authenticated, service_role;

-- ============================================================
-- Track device fingerprint
-- ============================================================
CREATE OR REPLACE FUNCTION public.fraud_track_device(
  p_fingerprint text, p_customer_id text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_fingerprint IS NULL OR length(p_fingerprint) < 4 THEN RETURN NULL; END IF;
  INSERT INTO public.fraud_device_fingerprints(
    fingerprint, customer_id, device_model, os_name, os_version, app_version, browser,
    ip_address, screen, timezone, language, hardware_id, metadata
  ) VALUES (
    p_fingerprint, p_customer_id,
    p_metadata->>'device_model', p_metadata->>'os_name', p_metadata->>'os_version',
    p_metadata->>'app_version', p_metadata->>'browser',
    p_metadata->>'ip_address', p_metadata->>'screen', p_metadata->>'timezone',
    p_metadata->>'language', p_metadata->>'hardware_id', coalesce(p_metadata,'{}'::jsonb)
  )
  ON CONFLICT (fingerprint, coalesce(customer_id,'')) DO UPDATE
    SET last_seen_at = now(),
        seen_count = public.fraud_device_fingerprints.seen_count + 1,
        ip_address = coalesce(EXCLUDED.ip_address, public.fraud_device_fingerprints.ip_address),
        metadata = public.fraud_device_fingerprints.metadata || coalesce(EXCLUDED.metadata,'{}'::jsonb),
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fraud_track_device(text,text,jsonb) TO authenticated, service_role;

-- ============================================================
-- Core evaluator (rewritten without inner PROCEDURE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fraud_evaluate(
  p_event text,
  p_customer_id text DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_device_fingerprint text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_order_id text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_matches jsonb := '[]'::jsonb;
  v_score int := 0;
  v_action text := 'allow';
  v_severity text := 'low';
  v_eval_id uuid;
  v_rule public.fraud_rules%ROWTYPE;
  v_count int;
  v_hit jsonb;
  v_reasons text[] := ARRAY[]::text[];
  v_match jsonb;
  v_act text; v_sev text;
BEGIN
  -- ---- Blacklist checks (always-on) ----
  IF p_customer_id IS NOT NULL AND public.fraud_blacklist_check('customer',p_customer_id) THEN
    v_matches := v_matches || jsonb_build_object('code','BLACKLIST_CUSTOMER','score',100,'action','block','severity','critical','reason','Customer is blacklisted');
  END IF;
  IF p_mobile IS NOT NULL AND public.fraud_blacklist_check('mobile',p_mobile) THEN
    v_matches := v_matches || jsonb_build_object('code','BLACKLIST_MOBILE','score',100,'action','block','severity','critical','reason','Mobile is blacklisted');
  END IF;
  IF p_device_fingerprint IS NOT NULL AND public.fraud_blacklist_check('device',p_device_fingerprint) THEN
    v_matches := v_matches || jsonb_build_object('code','BLACKLIST_DEVICE','score',100,'action','block','severity','critical','reason','Device is blacklisted');
  END IF;
  IF p_ip_address IS NOT NULL AND public.fraud_blacklist_check('ip',p_ip_address) THEN
    v_matches := v_matches || jsonb_build_object('code','BLACKLIST_IP','score',80,'action','block','severity','high','reason','IP is blacklisted');
  END IF;

  -- ---- Enabled rules ----
  FOR v_rule IN SELECT * FROM public.fraud_rules WHERE enabled = true ORDER BY priority ASC LOOP

    IF v_rule.code = 'MULTI_ACCOUNTS_PER_DEVICE' AND p_device_fingerprint IS NOT NULL THEN
      SELECT count(DISTINCT customer_id) INTO v_count FROM public.fraud_device_fingerprints
       WHERE fingerprint = p_device_fingerprint AND customer_id IS NOT NULL;
      IF v_count > v_rule.threshold THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('%s accounts share this device (limit %s)', v_count, v_rule.threshold));
      END IF;

    ELSIF v_rule.code = 'REPEATED_REGISTRATIONS_PER_DEVICE' AND p_device_fingerprint IS NOT NULL AND p_event = 'registration' THEN
      SELECT count(*) INTO v_count FROM public.fraud_evaluations
       WHERE device_fingerprint = p_device_fingerprint AND event = 'registration'
         AND created_at > now() - make_interval(secs => v_rule.window_seconds);
      IF v_count >= v_rule.threshold THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('%s registrations from this device in window', v_count));
      END IF;

    ELSIF v_rule.code = 'COUPON_ATTEMPT_RATE' AND p_event IN ('coupon_apply','coupon_view') THEN
      v_hit := public.fraud_rate_limit_hit('coupon_attempt',
        coalesce(p_customer_id, p_device_fingerprint, p_ip_address, 'anon'),
        v_rule.threshold, v_rule.window_seconds);
      IF (v_hit->>'blocked')::boolean THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('Coupon attempts exceeded (%s/%s)', v_hit->>'hits', v_rule.threshold));
      END IF;

    ELSIF v_rule.code = 'COUPON_GUESSING' AND p_event = 'coupon_apply' THEN
      SELECT count(*) INTO v_count FROM public.fraud_evaluations
       WHERE event = 'coupon_apply'
         AND (customer_id = p_customer_id OR device_fingerprint = p_device_fingerprint)
         AND (metadata->>'result') = 'invalid_code'
         AND created_at > now() - make_interval(secs => v_rule.window_seconds);
      IF v_count >= v_rule.threshold THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('%s invalid coupon attempts', v_count));
      END IF;

    ELSIF v_rule.code = 'ONE_COUPON_PER_MOBILE' AND p_mobile IS NOT NULL AND p_campaign_id IS NOT NULL AND p_event IN ('coupon_apply','redemption') THEN
      SELECT count(*) INTO v_count FROM public.coupon_redemptions r
        JOIN public.customers c ON c.id = r.customer_id
       WHERE r.campaign_id = p_campaign_id AND c.mobile = p_mobile AND r.rolled_back = false;
      IF v_count >= v_rule.threshold THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('Mobile already redeemed campaign %s times', v_count));
      END IF;

    ELSIF v_rule.code = 'ONE_COUPON_PER_DEVICE' AND p_device_fingerprint IS NOT NULL AND p_campaign_id IS NOT NULL AND p_event IN ('coupon_apply','redemption') THEN
      SELECT count(*) INTO v_count FROM public.fraud_evaluations
       WHERE campaign_id = p_campaign_id AND device_fingerprint = p_device_fingerprint
         AND event = 'redemption' AND action <> 'block';
      IF v_count >= v_rule.threshold THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('Device already used this campaign %s times', v_count));
      END IF;

    ELSIF v_rule.code = 'GPS_SPOOFING' AND p_customer_id IS NOT NULL AND p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
      PERFORM 1 FROM public.fraud_evaluations
       WHERE customer_id = p_customer_id AND lat IS NOT NULL AND lng IS NOT NULL
         AND created_at > now() - make_interval(secs => v_rule.window_seconds)
         AND (2 * 6371 * asin(sqrt(
             sin(radians((p_lat - lat)/2))^2 +
             cos(radians(lat)) * cos(radians(p_lat)) *
             sin(radians((p_lng - lng)/2))^2)) > v_rule.threshold)
       ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        v_matches := v_matches || jsonb_build_object('code',v_rule.code,'score',v_rule.score,'action',v_rule.action,'severity',v_rule.severity,
          'reason', format('Unrealistic location jump > %s km', v_rule.threshold));
      END IF;
    END IF;
  END LOOP;

  -- ---- Aggregate score, action, severity, reasons ----
  FOR v_match IN SELECT * FROM jsonb_array_elements(v_matches) LOOP
    v_score := v_score + coalesce((v_match->>'score')::int, 0);
    v_reasons := array_append(v_reasons, v_match->>'reason');
    v_act := v_match->>'action';
    v_sev := v_match->>'severity';

    IF v_act = 'blacklist' THEN v_action := 'blacklist';
    ELSIF v_act = 'block' AND v_action NOT IN ('blacklist') THEN v_action := 'block';
    ELSIF v_act = 'verify' AND v_action NOT IN ('blacklist','block') THEN v_action := 'verify';
    ELSIF v_act = 'warn' AND v_action NOT IN ('blacklist','block','verify') THEN v_action := 'warn';
    END IF;

    IF v_sev = 'critical' THEN v_severity := 'critical';
    ELSIF v_sev = 'high' AND v_severity NOT IN ('critical') THEN v_severity := 'high';
    ELSIF v_sev = 'medium' AND v_severity NOT IN ('critical','high') THEN v_severity := 'medium';
    END IF;
  END LOOP;

  IF v_action = 'allow' AND v_score >= 80 THEN v_action := 'block';
  ELSIF v_action = 'allow' AND v_score >= 40 THEN v_action := 'verify';
  ELSIF v_action = 'allow' AND v_score >= 15 THEN v_action := 'warn';
  END IF;

  -- ---- Persist evaluation ----
  INSERT INTO public.fraud_evaluations(event,customer_id,mobile,device_fingerprint,ip_address,
    campaign_id,code,order_id,lat,lng,score,action,matched_rules,metadata)
  VALUES (p_event,p_customer_id,p_mobile,p_device_fingerprint,p_ip_address,
    p_campaign_id,p_code,p_order_id,p_lat,p_lng,v_score,v_action,v_matches,coalesce(p_metadata,'{}'::jsonb))
  RETURNING id INTO v_eval_id;

  IF v_action IN ('block','verify','blacklist') OR v_severity IN ('high','critical') THEN
    INSERT INTO public.fraud_alerts(evaluation_id,event,severity,score,customer_id,mobile,
      device_fingerprint,ip_address,campaign_id,code,order_id,title,description,metadata)
    VALUES (v_eval_id,p_event,v_severity,v_score,p_customer_id,p_mobile,
      p_device_fingerprint,p_ip_address,p_campaign_id,p_code,p_order_id,
      format('Fraud %s on %s (score %s)', v_action, p_event, v_score),
      array_to_string(v_reasons, ' | '), v_matches);
  END IF;

  IF v_action = 'blacklist' AND p_device_fingerprint IS NOT NULL THEN
    PERFORM public.fraud_blacklist_add('device', p_device_fingerprint,
      'Auto-blacklisted by fraud engine', 'auto', v_severity, NULL, v_matches);
  END IF;

  RETURN jsonb_build_object(
    'ok', v_action IN ('allow','warn'),
    'evaluation_id', v_eval_id,
    'score', v_score,
    'action', v_action,
    'severity', v_severity,
    'matched_rules', v_matches,
    'reasons', v_reasons
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fraud_evaluate(text,text,text,text,text,uuid,text,text,double precision,double precision,jsonb) TO authenticated, service_role;

-- ============================================================
-- Seed default rules
-- ============================================================
INSERT INTO public.fraud_rules(code,name,description,category,severity,action,score,threshold,window_seconds,priority) VALUES
  ('MULTI_ACCOUNTS_PER_DEVICE','Multiple accounts on same device','Flag when a single device is linked to more accounts than allowed','device','high','verify',40,2,86400,10),
  ('REPEATED_REGISTRATIONS_PER_DEVICE','Repeated registrations per device','Flag repeated sign-ups from the same device','registration','high','block',50,3,86400,20),
  ('COUPON_ATTEMPT_RATE','Coupon attempt rate limit','Rate limit coupon attempts per customer/device/IP','rate_limit','medium','block',30,20,60,30),
  ('COUPON_GUESSING','Coupon brute-force guessing','Detect too many invalid coupon codes','coupon','high','block',60,5,600,40),
  ('ONE_COUPON_PER_MOBILE','One coupon per verified mobile','Enforce one redemption per mobile per campaign','coupon','critical','block',80,1,0,50),
  ('ONE_COUPON_PER_DEVICE','One coupon per device','Enforce one redemption per device per campaign','device','high','block',60,1,0,60),
  ('GPS_SPOOFING','GPS spoofing / unrealistic travel','Detect unrealistic location jumps (km) within window (s)','location','high','verify',35,500,600,70)
ON CONFLICT (code) DO NOTHING;
