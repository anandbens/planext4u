
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
  _vendor_referrer_code text;
  _vendor_referrer public.customers%ROWTYPE;
  _vendor_points int;
  _award_points constant int := 1; -- Refer & Earn: 1 wallet point per referred first order
BEGIN
  -- Only act when an order transitions into delivered/completed
  IF TG_OP <> 'UPDATE'
     OR NEW.status NOT IN ('delivered','completed')
     OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── 1. Customer referral: award referrer on referee's first delivered order ──
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

      -- Validate the referral relationship
      SELECT * INTO _referrer
      FROM public.customers
      WHERE referral_code = upper(trim(_referee.referred_by))
        AND status = 'active'
        AND id <> _referee.id
      LIMIT 1;

      IF _referrer.id IS NOT NULL THEN
        -- Idempotency: ensure not already credited for this referee
        SELECT * INTO _existing_ref
        FROM public.referrals
        WHERE referee_id = _referee.id
          AND referrer_id = _referrer.id
        LIMIT 1;

        IF _existing_ref.id IS NULL THEN
          -- Lazily create the referral row in 'completed' state
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
          -- Pre-existing pending row: credit it now (once)
          UPDATE public.customers
            SET wallet_points = COALESCE(wallet_points, 0) + COALESCE(_existing_ref.points_awarded, _award_points)
            WHERE id = _referrer.id;

          UPDATE public.referrals
            SET status = 'completed',
                first_order_placed = true,
                bonus_credited = true
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
        -- If bonus_credited already true → do nothing (prevents duplicates)
      END IF;
    END IF;
  END IF;

  -- ── 2. Vendor referral on first delivered order for this vendor (unchanged) ──
  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE vendor_id = NEW.vendor_id
      AND id <> NEW.id
      AND status IN ('delivered','completed')
  ) INTO _is_first;

  IF _is_first THEN
    SELECT referred_by INTO _vendor_referrer_code FROM public.vendors WHERE id = NEW.vendor_id;
    IF _vendor_referrer_code IS NULL OR length(trim(_vendor_referrer_code)) = 0 THEN
      SELECT referred_by INTO _vendor_referrer_code FROM public.service_vendors WHERE id = NEW.vendor_id;
    END IF;

    IF _vendor_referrer_code IS NOT NULL AND length(trim(_vendor_referrer_code)) > 0 THEN
      SELECT * INTO _vendor_referrer FROM public.customers
        WHERE referral_code = upper(trim(_vendor_referrer_code))
          AND status = 'active'
        LIMIT 1;

      IF _vendor_referrer.id IS NOT NULL THEN
        SELECT COALESCE(NULLIF(value,'')::int, 200) INTO _vendor_points
          FROM public.platform_variables WHERE key = 'vendor_referral_points';
        IF _vendor_points IS NULL THEN _vendor_points := 200; END IF;

        IF NOT EXISTS (
          SELECT 1 FROM public.points_transactions
          WHERE dedupe_key = 'vendor_referral_first_order:' || NEW.vendor_id
        ) THEN
          UPDATE public.customers
            SET wallet_points = COALESCE(wallet_points,0) + _vendor_points
            WHERE id = _vendor_referrer.id;

          INSERT INTO public.points_transactions (
            id, user_id, user_name, type, points, description,
            is_expired, cooling_status, expires_at, dedupe_key
          ) VALUES (
            'PT-VREF-' || substr(replace(gen_random_uuid()::text,'-',''),1,10),
            _vendor_referrer.id, _vendor_referrer.name, 'vendor_referral', _vendor_points,
            'Vendor referral first order reward',
            false, 'credited', now() + interval '60 days',
            'vendor_referral_first_order:' || NEW.vendor_id
          ) ON CONFLICT (dedupe_key) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_referral_on_first_delivery failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
