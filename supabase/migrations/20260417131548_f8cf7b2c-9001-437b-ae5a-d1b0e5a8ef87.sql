
-- Credit pending referral bonus when the referred customer's first order is delivered.
-- Works for both customer-referred-customer and customer-referred-vendor cases.
CREATE OR REPLACE FUNCTION public.credit_referral_on_first_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref record;
  _referrer record;
  _is_first boolean;
  _vendor_referrer_code text;
  _vendor_referrer record;
  _vendor_points int;
BEGIN
  -- Only act on transitions into delivered/completed
  IF TG_OP <> 'UPDATE' OR NEW.status NOT IN ('delivered','completed') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── 1. Customer referral cooling release ───────────────────────────────
  -- Was this the customer's first delivered order?
  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_id = NEW.customer_id
      AND id <> NEW.id
      AND status IN ('delivered','completed')
  ) INTO _is_first;

  IF _is_first THEN
    FOR _ref IN
      SELECT * FROM public.referrals
      WHERE referee_id = NEW.customer_id
        AND status = 'pending'
        AND COALESCE(bonus_credited, false) = false
    LOOP
      SELECT id, name, COALESCE(wallet_points,0) AS wallet_points
        INTO _referrer FROM public.customers WHERE id = _ref.referrer_id;

      IF _referrer.id IS NOT NULL THEN
        UPDATE public.customers
          SET wallet_points = _referrer.wallet_points + _ref.points_awarded
          WHERE id = _referrer.id;

        UPDATE public.referrals
          SET status = 'completed', first_order_placed = true, bonus_credited = true
          WHERE id = _ref.id;

        UPDATE public.points_transactions
          SET cooling_status = 'credited'
          WHERE user_id = _referrer.id
            AND type = 'referral'
            AND cooling_status = 'pending'
            AND description ILIKE '%' || COALESCE(NEW.customer_name, '') || '%';
      END IF;
    END LOOP;
  END IF;

  -- ── 2. Vendor referral on first delivered order for this vendor ────────
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
      SELECT id, name, COALESCE(wallet_points,0) AS wallet_points
        INTO _vendor_referrer FROM public.customers
        WHERE referral_code = upper(trim(_vendor_referrer_code))
          AND status = 'active'
        LIMIT 1;

      IF _vendor_referrer.id IS NOT NULL THEN
        SELECT COALESCE(NULLIF(value,'')::int, 200) INTO _vendor_points
          FROM public.platform_variables WHERE key = 'vendor_referral_points';
        IF _vendor_points IS NULL THEN _vendor_points := 200; END IF;

        -- Avoid double-crediting: only insert if no completed vendor_referral exists yet for this vendor
        IF NOT EXISTS (
          SELECT 1 FROM public.referrals
          WHERE referrer_id = _vendor_referrer.id
            AND referee_id = NEW.vendor_id
        ) THEN
          INSERT INTO public.referrals (id, referrer_id, referrer_name, referee_id, referee_name,
                                        status, points_awarded, first_order_placed, bonus_credited)
          VALUES ('REF-V-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
                  _vendor_referrer.id, _vendor_referrer.name,
                  NEW.vendor_id, COALESCE(NEW.vendor_name, NEW.vendor_id),
                  'completed', _vendor_points, true, true);

          INSERT INTO public.points_transactions (id, user_id, user_name, type, points, description,
                                                  is_expired, cooling_status, expires_at)
          VALUES ('PT-VR-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
                  _vendor_referrer.id, _vendor_referrer.name, 'vendor_referral', _vendor_points,
                  'Vendor referral bonus: ' || COALESCE(NEW.vendor_name, NEW.vendor_id) || ' completed first sale',
                  false, 'credited', (now() + interval '60 days'));

          UPDATE public.customers
            SET wallet_points = _vendor_referrer.wallet_points + _vendor_points
            WHERE id = _vendor_referrer.id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_referral_on_first_delivery failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_referral_on_first_delivery ON public.orders;
CREATE TRIGGER trg_credit_referral_on_first_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.credit_referral_on_first_delivery();
