-- The previous ON CONFLICT (dedupe_key) couldn't infer the partial unique
-- index, so it raised an error that was swallowed silently. Replace with an
-- explicit pre-check (the partial unique index still guards against races).
CREATE OR REPLACE FUNCTION public.credit_points_to_user(
  _auth_user_id uuid, _points integer, _type text, _description text, _dedupe_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cust RECORD;
  _expiry_days INT;
  _tx_id TEXT;
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

  BEGIN
    INSERT INTO public.points_transactions
      (id, user_id, user_name, type, points, description, is_expired, cooling_status, expires_at, dedupe_key)
    VALUES
      (_tx_id, _cust.id, _cust.name, _type, _points, _description, false, 'credited',
       now() + (COALESCE(_expiry_days,60) || ' days')::interval, _dedupe_key);

    UPDATE public.customers
      SET wallet_points = COALESCE(wallet_points,0) + _points
      WHERE id = _cust.id;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent insert with same dedupe_key — safe to ignore.
    RETURN;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'credit_points_to_user failed: %', SQLERRM;
END;
$function$;