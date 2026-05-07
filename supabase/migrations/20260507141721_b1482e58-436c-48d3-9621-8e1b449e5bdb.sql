CREATE OR REPLACE FUNCTION public.credit_referral_on_first_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_first boolean;
  _referee public.customers%ROWTYPE;
  _referrer public.customers%ROWTYPE;
  _existing_ref public.referrals%ROWTYPE;
  _ref_id text;
  _award_points int;
  _dedupe text;
BEGIN
  IF TG_OP <> 'UPDATE'
     OR NEW.status NOT IN ('delivered','completed')
     OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int, 100) INTO _award_points
    FROM public.platform_variables WHERE key = 'referral_points';
  IF _award_points IS NULL OR _award_points <= 0 THEN
    _award_points := 100;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_id = NEW.customer_id
      AND id <> NEW.id
      AND status IN ('delivered','completed')
  ) INTO _is_first;

  IF NOT _is_first THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _referee FROM public.customers WHERE id = NEW.customer_id;
  IF _referee.id IS NULL OR _referee.referred_by IS NULL OR length(trim(_referee.referred_by)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _referrer
  FROM public.customers
  WHERE referral_code = upper(trim(_referee.referred_by))
    AND status = 'active'
    AND id <> _referee.id
  LIMIT 1;

  IF _referrer.id IS NULL THEN
    RETURN NEW;
  END IF;

  _dedupe := 'referral_first_order:' || _referee.id;

  -- Idempotency: if we've already credited points for this referee, stop.
  IF EXISTS (SELECT 1 FROM public.points_transactions WHERE dedupe_key = _dedupe) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _existing_ref
  FROM public.referrals
  WHERE referee_id = _referee.id AND referrer_id = _referrer.id
  LIMIT 1;

  IF _existing_ref.id IS NULL THEN
    _ref_id := 'REF-' || substr(replace(gen_random_uuid()::text,'-',''),1,10);
    INSERT INTO public.referrals (
      id, referrer_id, referrer_name, referee_id, referee_name,
      status, points_awarded, first_order_placed, bonus_credited
    ) VALUES (
      _ref_id, _referrer.id, _referrer.name, _referee.id, _referee.name,
      'completed', _award_points, true, true
    );
  ELSE
    UPDATE public.referrals
      SET status = 'completed',
          first_order_placed = true,
          bonus_credited = true,
          points_awarded = COALESCE(NULLIF(_existing_ref.points_awarded,0), _award_points)
      WHERE id = _existing_ref.id;
    _award_points := COALESCE(NULLIF(_existing_ref.points_awarded,0), _award_points);
  END IF;

  UPDATE public.customers
    SET wallet_points = COALESCE(wallet_points, 0) + _award_points
    WHERE id = _referrer.id;

  BEGIN
    INSERT INTO public.points_transactions (
      id, user_id, user_name, type, points, description,
      is_expired, cooling_status, expires_at, dedupe_key
    ) VALUES (
      'PT-REF-' || substr(replace(gen_random_uuid()::text,'-',''),1,10),
      _referrer.id, _referrer.name, 'referral', _award_points,
      'Referral reward: ' || COALESCE(_referee.name, _referee.id) || ' completed first order',
      false, 'credited',
      now() + interval '60 days',
      _dedupe
    );
  EXCEPTION WHEN unique_violation THEN
    -- already credited concurrently; roll back the wallet increment we just did
    UPDATE public.customers
      SET wallet_points = GREATEST(COALESCE(wallet_points,0) - _award_points, 0)
      WHERE id = _referrer.id;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_referral_on_first_delivery failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;