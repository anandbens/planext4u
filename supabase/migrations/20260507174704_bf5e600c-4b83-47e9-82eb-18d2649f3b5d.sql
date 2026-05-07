-- Modify the existing vendor referral function to also fire when vendor is created/verified (not just kyc_status)
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
  _is_verified boolean;
  _was_verified boolean;
BEGIN
  _is_verified := COALESCE(NEW.status,'') IN ('verified','approved','active')
                  OR COALESCE(NEW.kyc_status,'') IN ('verified','approved');

  IF TG_OP = 'UPDATE' THEN
    _was_verified := COALESCE(OLD.status,'') IN ('verified','approved','active')
                     OR COALESCE(OLD.kyc_status,'') IN ('verified','approved');
  ELSE
    _was_verified := false;
  END IF;

  IF NOT _is_verified OR _was_verified THEN
    RETURN NEW;
  END IF;

  _ref_code := NULLIF(trim(COALESCE(NEW.referred_by, '')), '');
  IF _ref_code IS NULL THEN RETURN NEW; END IF;

  SELECT id, name INTO _referrer
    FROM public.customers
    WHERE referral_code = upper(_ref_code) AND status = 'active'
    LIMIT 1;
  IF _referrer.id IS NULL THEN RETURN NEW; END IF;

  -- Idempotency: only one reward per referred vendor
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

-- Replace the kyc_status-only trigger with one that fires on INSERT and any status/kyc_status change
DROP TRIGGER IF EXISTS trg_vendor_referral_on_verify ON public.vendors;
CREATE TRIGGER trg_vendor_referral_on_verify
AFTER INSERT OR UPDATE OF status, kyc_status ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.credit_vendor_referral_on_verify();

-- Also support service vendors
DROP TRIGGER IF EXISTS trg_vendor_referral_on_verify_svc ON public.service_vendors;
CREATE TRIGGER trg_vendor_referral_on_verify_svc
AFTER INSERT OR UPDATE OF status, kyc_status ON public.service_vendors
FOR EACH ROW EXECUTE FUNCTION public.credit_vendor_referral_on_verify();