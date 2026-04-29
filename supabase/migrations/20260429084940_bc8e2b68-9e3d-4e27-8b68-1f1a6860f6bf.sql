
-- 1. Helper: dedupe column + index
ALTER TABLE public.points_transactions
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_dedupe
  ON public.points_transactions(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 2. Helper function: credit points + log transaction (idempotent via dedupe_key)
CREATE OR REPLACE FUNCTION public.credit_points_to_user(
  _auth_user_id UUID,
  _points INT,
  _type TEXT,
  _description TEXT,
  _dedupe_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cust RECORD;
  _expiry_days INT;
  _tx_id TEXT;
  _inserted INT;
BEGIN
  IF _auth_user_id IS NULL OR _points <= 0 THEN RETURN; END IF;

  SELECT c.id, c.name, COALESCE(c.wallet_points,0) AS wallet_points
    INTO _cust
  FROM public.user_roles ur
  JOIN public.customers c ON c.id = ur.customer_id
  WHERE ur.user_id = _auth_user_id AND ur.role = 'customer'
  LIMIT 1;

  IF _cust.id IS NULL THEN RETURN; END IF;

  IF _dedupe_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.points_transactions WHERE dedupe_key = _dedupe_key
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int, 60) INTO _expiry_days
    FROM public.platform_variables WHERE key = 'points_expiry_days';

  _tx_id := 'PT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

  INSERT INTO public.points_transactions
    (id, user_id, user_name, type, points, description, is_expired, cooling_status, expires_at, dedupe_key)
  VALUES
    (_tx_id, _cust.id, _cust.name, _type, _points, _description, false, 'credited',
     now() + (COALESCE(_expiry_days,60) || ' days')::interval, _dedupe_key)
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted > 0 THEN
    UPDATE public.customers
      SET wallet_points = COALESCE(wallet_points,0) + _points
      WHERE id = _cust.id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_points_to_user failed: %', SQLERRM;
END;
$$;

-- 3. social_likes trigger: 1 pt to post author per unique like (skip self-like)
CREATE OR REPLACE FUNCTION public.handle_social_like_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_post_id uuid;
  target_owner uuid;
  _post_type text;
  _pts int;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  PERFORM public.refresh_social_post_counts(target_post_id);

  IF TG_OP = 'INSERT' THEN
    SELECT user_id, post_type INTO target_owner, _post_type
      FROM public.social_posts WHERE id = NEW.post_id;

    PERFORM public.create_social_notification(
      target_owner, NEW.user_id, 'like', NEW.post_id, 'post', 'liked your post'
    );

    IF target_owner IS NOT NULL AND target_owner <> NEW.user_id THEN
      SELECT COALESCE(NULLIF(value,'')::int, 1) INTO _pts
        FROM public.platform_variables WHERE key = 'post_like_points';
      PERFORM public.credit_points_to_user(
        target_owner, COALESCE(_pts,1), 'post_like',
        'Your ' || COALESCE(_post_type,'post') || ' was liked',
        'post_like:' || NEW.post_id::text || ':' || NEW.user_id::text
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. story view/reaction trigger: 1 pt for reaction='like'
CREATE OR REPLACE FUNCTION public.handle_social_story_view_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _author uuid;
  _pts int;
BEGIN
  UPDATE public.social_stories
    SET view_count = (SELECT count(*)::int FROM public.social_story_views WHERE story_id = NEW.story_id)
    WHERE id = NEW.story_id;

  IF COALESCE(NEW.reaction,'') = 'like' THEN
    SELECT user_id INTO _author FROM public.social_stories WHERE id = NEW.story_id;
    IF _author IS NOT NULL AND _author <> NEW.viewer_id THEN
      SELECT COALESCE(NULLIF(value,'')::int, 1) INTO _pts
        FROM public.platform_variables WHERE key = 'story_liked_points';
      PERFORM public.credit_points_to_user(
        _author, COALESCE(_pts,1), 'story_liked', 'Your story was liked',
        'story_like:' || NEW.story_id::text || ':' || NEW.viewer_id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_social_story_views_after_insert ON public.social_story_views;
DROP TRIGGER IF EXISTS trg_social_story_views_after_change ON public.social_story_views;
CREATE TRIGGER trg_social_story_views_after_change
  AFTER INSERT OR UPDATE OF reaction ON public.social_story_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_story_view_change();

-- 5. social_shares table to dedupe share-points per (user, post)
CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_shares_post ON public.social_shares(post_id);

ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read social_shares" ON public.social_shares;
CREATE POLICY "Public read social_shares" ON public.social_shares FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth insert own social_shares" ON public.social_shares;
CREATE POLICY "Auth insert own social_shares" ON public.social_shares
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_social_share_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _author uuid;
  _post_type text;
  _pts int;
BEGIN
  UPDATE public.social_posts
    SET share_count = (SELECT count(*)::int FROM public.social_shares WHERE post_id = NEW.post_id),
        updated_at = now()
    WHERE id = NEW.post_id;

  SELECT user_id, post_type INTO _author, _post_type
    FROM public.social_posts WHERE id = NEW.post_id;

  IF _author IS NOT NULL AND _author <> NEW.user_id THEN
    SELECT COALESCE(NULLIF(value,'')::int, 1) INTO _pts
      FROM public.platform_variables WHERE key = 'post_share_points';
    PERFORM public.credit_points_to_user(
      _author, COALESCE(_pts,1), 'post_share',
      'Your ' || COALESCE(_post_type,'post') || ' was shared',
      'post_share:' || NEW.post_id::text || ':' || NEW.user_id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_social_shares_after_insert ON public.social_shares;
CREATE TRIGGER trg_social_shares_after_insert
  AFTER INSERT ON public.social_shares
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_share_insert();

-- 6. Vendor referral on verification
CREATE OR REPLACE FUNCTION public.credit_vendor_referral_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ref_code text;
  _referrer record;
  _pts int;
  _auth_uid uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.kyc_status,'') NOT IN ('verified','approved') THEN RETURN NEW; END IF;
  IF COALESCE(OLD.kyc_status,'') = NEW.kyc_status THEN RETURN NEW; END IF;

  _ref_code := NULLIF(trim(COALESCE(NEW.referred_by, '')), '');
  IF _ref_code IS NULL THEN RETURN NEW; END IF;

  SELECT id, name INTO _referrer
    FROM public.customers
    WHERE referral_code = upper(_ref_code) AND status = 'active'
    LIMIT 1;
  IF _referrer.id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = _referrer.id AND referee_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int, 200) INTO _pts
    FROM public.platform_variables WHERE key = 'vendor_referral_points';

  INSERT INTO public.referrals (id, referrer_id, referrer_name, referee_id, referee_name,
                                status, points_awarded, first_order_placed, bonus_credited)
  VALUES ('REF-V-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
          _referrer.id, _referrer.name, NEW.id,
          COALESCE(NEW.business_name, NEW.name, NEW.id),
          'completed', _pts, false, true);

  SELECT user_id INTO _auth_uid
    FROM public.user_roles
    WHERE customer_id = _referrer.id AND role = 'customer'
    LIMIT 1;

  IF _auth_uid IS NOT NULL THEN
    PERFORM public.credit_points_to_user(
      _auth_uid, _pts, 'vendor_referral',
      'Vendor referral: ' || COALESCE(NEW.business_name, NEW.name, NEW.id) || ' got verified',
      'vendor_referral_verify:' || NEW.id
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_vendor_referral_on_verify failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vendor_referral_on_verify ON public.vendors;
CREATE TRIGGER trg_vendor_referral_on_verify
  AFTER UPDATE OF kyc_status ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.credit_vendor_referral_on_verify();
