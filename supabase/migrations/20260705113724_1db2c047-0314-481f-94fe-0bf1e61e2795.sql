CREATE OR REPLACE FUNCTION public.get_auth_bootstrap(_portal text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.app_role;
  _role_id uuid;
  _customer_id text;
  _vendor_id text;
  _password_set boolean;
  _profile jsonb;
  _roles record;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status', 'no_session');
  END IF;

  FOR _roles IN
    SELECT ur.id, ur.role, ur.customer_id, ur.vendor_id, ur.password_set,
      CASE
        WHEN _portal = 'admin' AND ur.role IN ('admin','finance','sales') THEN 0
        WHEN _portal = 'customer' AND ur.role = 'customer' THEN 0
        WHEN _portal = 'vendor' AND ur.role = 'vendor' THEN 0
        ELSE 1
      END AS portal_rank
    FROM public.user_roles ur
    WHERE ur.user_id = _uid
    ORDER BY portal_rank, ur.created_at DESC NULLS LAST, ur.id DESC
  LOOP
    _role := _roles.role;
    _role_id := _roles.id;
    _customer_id := _roles.customer_id;
    _vendor_id := _roles.vendor_id;
    _password_set := COALESCE(_roles.password_set, false);

    IF _role IN ('admin','finance','sales') THEN
      RETURN jsonb_build_object(
        'status', 'loaded',
        'role_record', jsonb_build_object(
          'id', _role_id,
          'role', _role,
          'customer_id', _customer_id,
          'vendor_id', _vendor_id,
          'password_set', _password_set
        )
      );
    END IF;

    IF _role = 'customer' AND _customer_id IS NOT NULL THEN
      SELECT to_jsonb(c) INTO _profile
      FROM (
        SELECT id, name, email, mobile, status
        FROM public.customers
        WHERE id = _customer_id
        LIMIT 1
      ) c;

      IF _profile IS NOT NULL THEN
        RETURN jsonb_build_object(
          'status', 'loaded',
          'role_record', jsonb_build_object(
            'id', _role_id,
            'role', _role,
            'customer_id', _customer_id,
            'vendor_id', _vendor_id,
            'password_set', _password_set,
            '__profile', _profile
          )
        );
      END IF;
    END IF;

    IF _role = 'vendor' AND _vendor_id IS NOT NULL THEN
      SELECT to_jsonb(v) INTO _profile
      FROM (
        SELECT id, name, business_name, email, mobile, status
        FROM public.vendors
        WHERE id = _vendor_id
        LIMIT 1
      ) v;

      IF _profile IS NULL THEN
        SELECT to_jsonb(sv) INTO _profile
        FROM (
          SELECT id, name, business_name, email, mobile, status
          FROM public.service_vendors
          WHERE id = _vendor_id
          LIMIT 1
        ) sv;
      END IF;

      IF _profile IS NOT NULL THEN
        RETURN jsonb_build_object(
          'status', 'loaded',
          'role_record', jsonb_build_object(
            'id', _role_id,
            'role', _role,
            'customer_id', _customer_id,
            'vendor_id', _vendor_id,
            'password_set', _password_set,
            '__profile', _profile
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('status', 'unregistered');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_bootstrap(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_bootstrap(text) TO service_role;