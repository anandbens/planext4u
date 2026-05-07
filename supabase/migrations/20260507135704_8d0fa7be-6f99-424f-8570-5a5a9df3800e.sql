CREATE OR REPLACE FUNCTION public.check_phone_login_status(_phone text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'found', EXISTS (
      SELECT 1 FROM public.customers
      WHERE status <> 'deleted'
        AND (
          mobile = _phone
          OR mobile = regexp_replace(_phone, '^\+\d{1,3}', '')
          OR mobile ILIKE '%' || regexp_replace(_phone, '^\+\d{1,3}', '') || '%'
        )
    ),
    'status', (
      SELECT status FROM public.customers
      WHERE status <> 'deleted'
        AND (
          mobile = _phone
          OR mobile = regexp_replace(_phone, '^\+\d{1,3}', '')
          OR mobile ILIKE '%' || regexp_replace(_phone, '^\+\d{1,3}', '') || '%'
        )
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END
      LIMIT 1
    )
  )
$function$;