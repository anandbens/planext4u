
CREATE OR REPLACE FUNCTION public.record_public_registration_payment(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  ent_type payment_entity_type;
  pay_mode payment_mode_type;
  pay_status payment_status_type;
BEGIN
  ent_type := (payload->>'entity_type')::payment_entity_type;
  pay_mode := COALESCE(NULLIF(payload->>'payment_mode',''),'upi')::payment_mode_type;
  pay_status := COALESCE(NULLIF(payload->>'payment_status',''),'pending')::payment_status_type;

  INSERT INTO public.payment_records (
    entity_type, entity_id, plan_id, plan_amount, amount_paid, balance,
    payment_mode, payment_status, transaction_ref, payment_date, remarks, metadata
  )
  VALUES (
    ent_type,
    payload->>'entity_id',
    NULLIF(payload->>'plan_id','')::uuid,
    COALESCE((payload->>'plan_amount')::numeric, 0),
    COALESCE((payload->>'amount_paid')::numeric, 0),
    COALESCE((payload->>'balance')::numeric, 0),
    pay_mode,
    pay_status,
    NULLIF(payload->>'transaction_ref',''),
    NULLIF(payload->>'payment_date','')::timestamptz,
    NULLIF(payload->>'remarks',''),
    COALESCE(payload->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_public_registration_payment(jsonb) TO anon, authenticated, service_role;
