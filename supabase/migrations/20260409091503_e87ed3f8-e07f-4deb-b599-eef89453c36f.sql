CREATE OR REPLACE FUNCTION public.check_phone_registered(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE status = 'active'
      AND (
        mobile = _phone
        OR mobile = regexp_replace(_phone, '^\+\d{1,3}', '')
        OR mobile ILIKE '%' || regexp_replace(_phone, '^\+\d{1,3}', '') || '%'
      )
  )
$$;