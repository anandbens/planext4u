
CREATE OR REPLACE FUNCTION public.get_my_customer_orders()
RETURNS SETOF public.orders
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  my_uid uuid := auth.uid();
  my_cust text;
  my_mobile text;
  my_email text;
  norm_mobile text;
  cust_ids text[];
BEGIN
  IF my_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT customer_id INTO my_cust FROM public.user_roles
    WHERE user_id = my_uid AND role='customer' AND customer_id IS NOT NULL LIMIT 1;

  IF my_cust IS NOT NULL THEN
    SELECT mobile, email INTO my_mobile, my_email FROM public.customers WHERE id = my_cust;
  END IF;

  IF my_mobile IS NULL OR my_email IS NULL THEN
    SELECT COALESCE(my_mobile, au.phone), COALESCE(my_email, au.email)
      INTO my_mobile, my_email
    FROM auth.users au WHERE au.id = my_uid;
  END IF;

  -- normalise mobile: strip +, country prefix 91, spaces
  norm_mobile := regexp_replace(COALESCE(my_mobile,''), '[^0-9]', '', 'g');
  IF length(norm_mobile) > 10 THEN
    norm_mobile := right(norm_mobile, 10);
  END IF;

  SELECT COALESCE(array_agg(DISTINCT c.id), ARRAY[]::text[])
    INTO cust_ids
  FROM public.customers c
  WHERE c.deleted_at IS NULL
    AND (
      c.id = my_cust
      OR (norm_mobile <> '' AND regexp_replace(COALESCE(c.mobile,''), '[^0-9]', '', 'g') LIKE '%'||norm_mobile)
      OR (my_email IS NOT NULL AND my_email <> '' AND lower(c.email) = lower(my_email))
    );

  IF cust_ids IS NULL OR array_length(cust_ids,1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT * FROM public.orders o
     WHERE o.customer_id = ANY(cust_ids)
       AND o.deleted_at IS NULL
     ORDER BY o.created_at DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_my_customer_orders() TO authenticated;
