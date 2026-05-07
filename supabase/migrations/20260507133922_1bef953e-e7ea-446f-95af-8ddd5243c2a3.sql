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
BEGIN
  IF TG_OP <> 'UPDATE'
     OR NEW.status NOT IN ('delivered','completed')
     OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Read configurable referral_points (default 100)
  SELECT COALESCE(NULLIF(value,'')::int, 100) INTO _award_points
    FROM public.platform_variables WHERE key = 'referral_points';
  IF _award_points IS NULL OR _award_points <= 0 THEN
    _award_points := 100;
  END IF;

  -- Customer referral: award referrer on referee's first delivered order
  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_id = NEW.customer_id
      AND id <> NEW.id
      AND status IN ('delivered','completed')
  ) INTO _is_first;

  IF _is_first THEN
    SELECT * INTO _referee FROM public.customers WHERE id = NEW.customer_id;

    IF _referee.id IS NOT NULL
       AND _referee.referred_by IS NOT NULL
       AND length(trim(_referee.referred_by)) > 0 THEN

      SELECT * INTO _referrer
      FROM public.customers
      WHERE referral_code = upper(trim(_referee.referred_by))
        AND status = 'active'
        AND id <> _referee.id
      LIMIT 1;

      IF _referrer.id IS NOT NULL THEN
        SELECT * INTO _existing_ref
        FROM public.referrals
        WHERE referee_id = _referee.id
          AND referrer_id = _referrer.id
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

          UPDATE public.customers
            SET wallet_points = COALESCE(wallet_points, 0) + _award_points
            WHERE id = _referrer.id;

          INSERT INTO public.points_transactions (
            id, user_id, user_name, type, points, description,
            is_expired, cooling_status, expires_at, dedupe_key
          ) VALUES (
            'PT-REF-' || substr(replace(gen_random_uuid()::text,'-',''),1,10),
            _referrer.id, _referrer.name, 'referral', _award_points,
            'Referral reward: ' || COALESCE(_referee.name, _referee.id) || ' completed first order',
            false, 'credited',
            now() + interval '60 days',
            'referral_first_order:' || _referee.id
          )
          ON CONFLICT (dedupe_key) DO NOTHING;

        ELSIF COALESCE(_existing_ref.bonus_credited, false) = false THEN
          UPDATE public.customers
            SET wallet_points = COALESCE(wallet_points, 0) + COALESCE(_existing_ref.points_awarded, _award_points)
            WHERE id = _referrer.id;

          UPDATE public.referrals
            SET status = 'completed',
                first_order_placed = true,
                bonus_credited = true,
                points_awarded = COALESCE(_existing_ref.points_awarded, _award_points)
            WHERE id = _existing_ref.id;

          INSERT INTO public.points_transactions (
            id, user_id, user_name, type, points, description,
            is_expired, cooling_status, expires_at, dedupe_key
          ) VALUES (
            'PT-REF-' || substr(replace(gen_random_uuid()::text,'-',''),1,10),
            _referrer.id, _referrer.name, 'referral',
            COALESCE(_existing_ref.points_awarded, _award_points),
            'Referral reward: ' || COALESCE(_referee.name, _referee.id) || ' completed first order',
            false, 'credited',
            now() + interval '60 days',
            'referral_first_order:' || _referee.id
          )
          ON CONFLICT (dedupe_key) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Vendor referral is handled exclusively by credit_vendor_referral_on_verify
  -- (awards 200 points once, on KYC verification). Do not re-credit on first order.

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_referral_on_first_delivery failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;