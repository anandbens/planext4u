CREATE OR REPLACE FUNCTION public.submit_public_franchise_registration(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  status_in text;
BEGIN
  status_in := COALESCE(payload->>'status','pending');
  -- Coerce any legacy/invalid status to 'pending'
  IF status_in NOT IN ('draft','pending','approved','rejected','converted','closed') THEN
    status_in := 'pending';
  END IF;

  INSERT INTO public.franchise_registrations (
    applicant_name, email, mobile, company_name, address, city, district, state,
    pincode, country, requested_territory, notes, plan_id, status
  )
  VALUES (
    payload->>'applicant_name', payload->>'email', payload->>'mobile',
    payload->>'company_name', payload->>'address', payload->>'city',
    payload->>'district', payload->>'state', payload->>'pincode',
    COALESCE(payload->>'country','India'),
    payload->>'requested_territory', payload->>'notes',
    NULLIF(payload->>'plan_id','')::uuid,
    status_in::franchise_registration_status
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;