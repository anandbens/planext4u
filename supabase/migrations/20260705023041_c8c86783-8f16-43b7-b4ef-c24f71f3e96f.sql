
-- 1. Columns for archive retention
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS archive_retention_days integer,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_status_expires
  ON public.coupon_campaigns (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_status_campaign
  ON public.coupon_codes (status, campaign_id);

-- 2. Comprehensive scheduler function (replaces earlier expire_coupons_and_campaigns)
CREATE OR REPLACE FUNCTION public.expire_coupons_and_campaigns()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := now();
  v_campaigns_expired int := 0;
  v_campaigns_exhausted int := 0;
  v_codes_expired int := 0;
  v_codes_disabled int := 0;
  v_campaigns_archived int := 0;
  v_synced int := 0;
BEGIN
  -- Distributed-safe: bail if another run holds the lock
  IF NOT pg_try_advisory_xact_lock(hashtext('coupon_scheduler')) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'another_run_in_progress');
  END IF;

  ------------------------------------------------------------------
  -- A. Campaign expiry (past end date)
  ------------------------------------------------------------------
  WITH expired AS (
    UPDATE public.coupon_campaigns
       SET status = 'expired', updated_at = now()
     WHERE expires_at IS NOT NULL
       AND expires_at <= now()
       AND status IN ('active')
     RETURNING id
  )
  SELECT count(*) INTO v_campaigns_expired FROM expired;

  ------------------------------------------------------------------
  -- B. Expire all unused codes tied to expired / disabled campaigns
  ------------------------------------------------------------------
  WITH expired_codes AS (
    UPDATE public.coupon_codes cc
       SET status = 'expired'
      FROM public.coupon_campaigns c
     WHERE cc.campaign_id = c.id
       AND cc.status IN ('available', 'reserved')
       AND (c.status IN ('expired', 'disabled')
            OR (c.expires_at IS NOT NULL AND c.expires_at <= now()))
     RETURNING cc.id
  )
  SELECT count(*) INTO v_codes_expired FROM expired_codes;

  ------------------------------------------------------------------
  -- C. Sync per-campaign counters (status synchronization)
  ------------------------------------------------------------------
  WITH counts AS (
    SELECT campaign_id,
           count(*) FILTER (WHERE status = 'used') AS used_c,
           count(*) AS gen_c
      FROM public.coupon_codes
     GROUP BY campaign_id
  ),
  synced AS (
    UPDATE public.coupon_campaigns c
       SET total_codes_used = counts.used_c,
           total_codes_generated = counts.gen_c,
           updated_at = now()
      FROM counts
     WHERE c.id = counts.campaign_id
       AND (c.total_codes_used  IS DISTINCT FROM counts.used_c
         OR c.total_codes_generated IS DISTINCT FROM counts.gen_c)
     RETURNING c.id
  )
  SELECT count(*) INTO v_synced FROM synced;

  ------------------------------------------------------------------
  -- D. Quantity-limit exhaustion (qty_limit / total_codes_target hit)
  ------------------------------------------------------------------
  WITH exhausted AS (
    UPDATE public.coupon_campaigns
       SET status = 'exhausted', updated_at = now()
     WHERE status = 'active'
       AND (
         (qty_limit IS NOT NULL AND qty_limit > 0 AND total_codes_used >= qty_limit)
         OR (total_codes_target IS NOT NULL AND total_codes_target > 0
             AND total_codes_used >= total_codes_target)
       )
     RETURNING id
  )
  SELECT count(*) INTO v_campaigns_exhausted FROM exhausted;

  -- Disable remaining unused codes on exhausted campaigns
  WITH disabled_codes AS (
    UPDATE public.coupon_codes cc
       SET status = 'disabled'
      FROM public.coupon_campaigns c
     WHERE cc.campaign_id = c.id
       AND c.status = 'exhausted'
       AND cc.status IN ('available', 'reserved')
     RETURNING cc.id
  )
  SELECT count(*) INTO v_codes_disabled FROM disabled_codes;

  ------------------------------------------------------------------
  -- E. Auto-archive campaigns whose retention window has passed
  ------------------------------------------------------------------
  WITH archived AS (
    UPDATE public.coupon_campaigns
       SET archived_at = now(),
           is_active = false,
           updated_at = now()
     WHERE archived_at IS NULL
       AND status IN ('expired', 'exhausted', 'disabled')
       AND archive_retention_days IS NOT NULL
       AND archive_retention_days > 0
       AND updated_at <= now() - make_interval(days => archive_retention_days)
     RETURNING id
  )
  SELECT count(*) INTO v_campaigns_archived FROM archived;

  ------------------------------------------------------------------
  -- F. Audit log
  ------------------------------------------------------------------
  IF v_campaigns_expired + v_campaigns_exhausted + v_codes_expired
     + v_codes_disabled + v_campaigns_archived + v_synced > 0 THEN
    INSERT INTO public.coupon_audit_log (event_type, reason, metadata)
    VALUES (
      'scheduler_run',
      'automatic_lifecycle_service',
      jsonb_build_object(
        'started_at', v_started_at,
        'finished_at', now(),
        'campaigns_expired',   v_campaigns_expired,
        'campaigns_exhausted', v_campaigns_exhausted,
        'campaigns_archived',  v_campaigns_archived,
        'codes_expired',       v_codes_expired,
        'codes_disabled',      v_codes_disabled,
        'counters_synced',     v_synced
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'campaigns_expired',   v_campaigns_expired,
    'campaigns_exhausted', v_campaigns_exhausted,
    'campaigns_archived',  v_campaigns_archived,
    'codes_expired',       v_codes_expired,
    'codes_disabled',      v_codes_disabled,
    'counters_synced',     v_synced
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_coupons_and_campaigns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_coupons_and_campaigns() TO service_role;

-- 3. Re-schedule pg_cron: run every 5 minutes (removes older 15-min job if present)
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'coupon-scheduler-15min';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;

  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'coupon-scheduler-5min';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;

  PERFORM cron.schedule(
    'coupon-scheduler-5min',
    '*/5 * * * *',
    $cron$ SELECT public.expire_coupons_and_campaigns(); $cron$
  );
END $$;
