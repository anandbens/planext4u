CREATE OR REPLACE FUNCTION public.admin_list_franchise_registrations(
  _status text DEFAULT NULL,
  _plan_id uuid DEFAULT NULL,
  _state text DEFAULT NULL,
  _district text DEFAULT NULL,
  _city text DEFAULT NULL,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  registration_no text,
  applicant_name text,
  company_name text,
  email text,
  mobile text,
  city text,
  district text,
  state text,
  pincode text,
  address text,
  plan_id uuid,
  requested_territory text,
  status text,
  rejection_reason text,
  notes text,
  created_at timestamptz,
  franchise_plans jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view franchise registrations';
  END IF;

  RETURN QUERY
  SELECT
    fr.id,
    fr.registration_no,
    fr.applicant_name,
    fr.company_name,
    fr.email,
    fr.mobile,
    fr.city,
    fr.district,
    fr.state,
    fr.pincode,
    fr.address,
    fr.plan_id,
    fr.requested_territory,
    fr.status::text,
    fr.rejection_reason,
    fr.notes,
    fr.created_at,
    CASE WHEN fp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', fp.id,
      'name', fp.name,
      'investment_amount', fp.investment_amount,
      'benefits', fp.benefits,
      'features', fp.features,
      'coverage_type', fp.coverage_type,
      'delivery_radius_km', fp.delivery_radius_km,
      'validity_months', fp.validity_months
    ) END AS franchise_plans
  FROM public.franchise_registrations fr
  LEFT JOIN public.franchise_plans fp ON fp.id = fr.plan_id
  WHERE (_status IS NULL OR _status = 'all' OR fr.status::text = _status)
    AND (_plan_id IS NULL OR fr.plan_id = _plan_id)
    AND (_state IS NULL OR fr.state ILIKE '%' || _state || '%')
    AND (_district IS NULL OR fr.district ILIKE '%' || _district || '%')
    AND (_city IS NULL OR fr.city ILIKE '%' || _city || '%')
    AND (
      _search IS NULL OR
      fr.mobile ILIKE '%' || _search || '%' OR
      fr.email ILIKE '%' || _search || '%' OR
      fr.applicant_name ILIKE '%' || _search || '%' OR
      fr.company_name ILIKE '%' || _search || '%' OR
      fr.registration_no ILIKE '%' || _search || '%'
    )
  ORDER BY fr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_franchise_registrations(text, uuid, text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_franchise_management(
  _status text DEFAULT NULL,
  _plan_id uuid DEFAULT NULL,
  _state text DEFAULT NULL,
  _district text DEFAULT NULL,
  _city text DEFAULT NULL,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  franchise_id text,
  registration_id uuid,
  plan_id uuid,
  owner_name text,
  company_name text,
  email text,
  mobile text,
  address text,
  city text,
  district text,
  state text,
  pincode text,
  territory text,
  started_at timestamptz,
  expires_at timestamptz,
  status text,
  notes text,
  created_at timestamptz,
  source_type text,
  franchise_plans jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view franchise management';
  END IF;

  RETURN QUERY
  SELECT
    af.id,
    af.franchise_id,
    af.registration_id,
    af.plan_id,
    af.owner_name,
    af.company_name,
    af.email,
    af.mobile,
    af.address,
    af.city,
    af.district,
    af.state,
    af.pincode,
    af.territory,
    af.started_at,
    af.expires_at,
    af.status::text,
    af.notes,
    af.created_at,
    'active'::text AS source_type,
    CASE WHEN fp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', fp.id,
      'name', fp.name,
      'investment_amount', fp.investment_amount,
      'benefits', fp.benefits,
      'features', fp.features,
      'coverage_type', fp.coverage_type,
      'delivery_radius_km', fp.delivery_radius_km,
      'validity_months', fp.validity_months
    ) END AS franchise_plans
  FROM public.active_franchises af
  LEFT JOIN public.franchise_plans fp ON fp.id = af.plan_id
  WHERE (_status IS NULL OR _status = 'all' OR af.status::text = _status)
    AND (_plan_id IS NULL OR af.plan_id = _plan_id)
    AND (_state IS NULL OR af.state ILIKE '%' || _state || '%')
    AND (_district IS NULL OR af.district ILIKE '%' || _district || '%')
    AND (_city IS NULL OR af.city ILIKE '%' || _city || '%')
    AND (
      _search IS NULL OR
      af.mobile ILIKE '%' || _search || '%' OR
      af.email ILIKE '%' || _search || '%' OR
      af.owner_name ILIKE '%' || _search || '%' OR
      af.company_name ILIKE '%' || _search || '%' OR
      af.franchise_id ILIKE '%' || _search || '%'
    )

  UNION ALL

  SELECT
    fr.id,
    fr.registration_no AS franchise_id,
    fr.id AS registration_id,
    fr.plan_id,
    fr.applicant_name AS owner_name,
    fr.company_name,
    fr.email,
    fr.mobile,
    fr.address,
    fr.city,
    fr.district,
    fr.state,
    fr.pincode,
    fr.requested_territory AS territory,
    fr.created_at AS started_at,
    NULL::timestamptz AS expires_at,
    fr.status::text,
    fr.notes,
    fr.created_at,
    'registration'::text AS source_type,
    CASE WHEN fp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', fp.id,
      'name', fp.name,
      'investment_amount', fp.investment_amount,
      'benefits', fp.benefits,
      'features', fp.features,
      'coverage_type', fp.coverage_type,
      'delivery_radius_km', fp.delivery_radius_km,
      'validity_months', fp.validity_months
    ) END AS franchise_plans
  FROM public.franchise_registrations fr
  LEFT JOIN public.franchise_plans fp ON fp.id = fr.plan_id
  WHERE NOT EXISTS (
      SELECT 1 FROM public.active_franchises af2 WHERE af2.registration_id = fr.id
    )
    AND (_status IS NULL OR _status = 'all' OR fr.status::text = _status)
    AND (_plan_id IS NULL OR fr.plan_id = _plan_id)
    AND (_state IS NULL OR fr.state ILIKE '%' || _state || '%')
    AND (_district IS NULL OR fr.district ILIKE '%' || _district || '%')
    AND (_city IS NULL OR fr.city ILIKE '%' || _city || '%')
    AND (
      _search IS NULL OR
      fr.mobile ILIKE '%' || _search || '%' OR
      fr.email ILIKE '%' || _search || '%' OR
      fr.applicant_name ILIKE '%' || _search || '%' OR
      fr.company_name ILIKE '%' || _search || '%' OR
      fr.registration_no ILIKE '%' || _search || '%'
    )
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_franchise_management(text, uuid, text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_franchise_payment_ledger(
  _date_from timestamptz DEFAULT NULL,
  _date_to timestamptz DEFAULT NULL,
  _state text DEFAULT NULL,
  _district text DEFAULT NULL,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  payment_record_id uuid,
  receipt_id uuid,
  receipt_no text,
  registration_no text,
  entity_type text,
  entity_id text,
  entity_name text,
  plan_id uuid,
  plan_name text,
  plan_amount numeric,
  amount_paid numeric,
  balance numeric,
  payment_mode text,
  transaction_ref text,
  payment_date timestamptz,
  payment_status text,
  state text,
  district text,
  city text,
  snapshot jsonb,
  is_synthetic_pending boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view registration payments';
  END IF;

  RETURN QUERY
  WITH franchise_payments AS (
    SELECT
      pr.*,
      COALESCE(fr.id, afr.id) AS fr_id,
      COALESCE(fr.registration_no, afr.registration_no) AS reg_no,
      COALESCE(fr.company_name, fr.applicant_name, afr.company_name, afr.applicant_name) AS reg_name,
      COALESCE(fr.state, afr.state) AS reg_state,
      COALESCE(fr.district, afr.district) AS reg_district,
      COALESCE(fr.city, afr.city) AS reg_city,
      COALESCE(fr.plan_id, afr.plan_id, pr.plan_id) AS resolved_plan_id
    FROM public.payment_records pr
    LEFT JOIN public.franchise_registrations fr ON pr.entity_id = fr.id::text
    LEFT JOIN public.active_franchises af ON pr.entity_id = af.id::text
    LEFT JOIN public.franchise_registrations afr ON af.registration_id = afr.id
    WHERE pr.entity_type = 'franchise'::payment_entity_type
  )
  SELECT
    fp.id::text,
    fp.id AS payment_record_id,
    rc.id AS receipt_id,
    COALESCE(rc.receipt_no, '—') AS receipt_no,
    COALESCE(fp.reg_no, '—') AS registration_no,
    'franchise'::text AS entity_type,
    fp.entity_id,
    COALESCE(fp.reg_name, '—') AS entity_name,
    fp.resolved_plan_id AS plan_id,
    COALESCE(pl.name, fp.metadata->>'plan_name', '—') AS plan_name,
    COALESCE(fp.plan_amount, pl.investment_amount, 0) AS plan_amount,
    COALESCE(fp.amount_paid, 0) AS amount_paid,
    COALESCE(fp.balance, GREATEST(COALESCE(fp.plan_amount, pl.investment_amount, 0) - COALESCE(fp.amount_paid, 0), 0)) AS balance,
    COALESCE(fp.payment_mode::text, '—') AS payment_mode,
    COALESCE(fp.transaction_ref, '—') AS transaction_ref,
    COALESCE(fp.payment_date, fp.created_at) AS payment_date,
    COALESCE(fp.payment_status::text, 'pending') AS payment_status,
    fp.reg_state AS state,
    fp.reg_district AS district,
    fp.reg_city AS city,
    COALESCE(rc.snapshot, '{}'::jsonb) AS snapshot,
    false AS is_synthetic_pending
  FROM franchise_payments fp
  LEFT JOIN public.franchise_plans pl ON pl.id = fp.resolved_plan_id
  LEFT JOIN public.payment_receipts rc ON rc.payment_record_id = fp.id
  WHERE (_date_from IS NULL OR COALESCE(fp.payment_date, fp.created_at) >= _date_from)
    AND (_date_to IS NULL OR COALESCE(fp.payment_date, fp.created_at) <= _date_to)
    AND (_state IS NULL OR fp.reg_state ILIKE '%' || _state || '%')
    AND (_district IS NULL OR fp.reg_district ILIKE '%' || _district || '%')
    AND (
      _search IS NULL OR
      fp.reg_no ILIKE '%' || _search || '%' OR
      fp.reg_name ILIKE '%' || _search || '%' OR
      fp.transaction_ref ILIKE '%' || _search || '%'
    )

  UNION ALL

  SELECT
    'pending-' || fr.id::text AS id,
    NULL::uuid AS payment_record_id,
    NULL::uuid AS receipt_id,
    '—'::text AS receipt_no,
    fr.registration_no,
    'franchise'::text AS entity_type,
    fr.id::text AS entity_id,
    COALESCE(fr.company_name, fr.applicant_name, '—') AS entity_name,
    fr.plan_id,
    COALESCE(pl.name, '—') AS plan_name,
    COALESCE(pl.investment_amount, 0) AS plan_amount,
    0::numeric AS amount_paid,
    COALESCE(pl.investment_amount, 0) AS balance,
    '—'::text AS payment_mode,
    '—'::text AS transaction_ref,
    fr.created_at AS payment_date,
    'pending'::text AS payment_status,
    fr.state,
    fr.district,
    fr.city,
    '{}'::jsonb AS snapshot,
    true AS is_synthetic_pending
  FROM public.franchise_registrations fr
  LEFT JOIN public.franchise_plans pl ON pl.id = fr.plan_id
  WHERE NOT EXISTS (
      SELECT 1
      FROM public.payment_records pr
      LEFT JOIN public.active_franchises af ON pr.entity_id = af.id::text
      WHERE pr.entity_type = 'franchise'::payment_entity_type
        AND (pr.entity_id = fr.id::text OR af.registration_id = fr.id)
    )
    AND (_date_from IS NULL OR fr.created_at >= _date_from)
    AND (_date_to IS NULL OR fr.created_at <= _date_to)
    AND (_state IS NULL OR fr.state ILIKE '%' || _state || '%')
    AND (_district IS NULL OR fr.district ILIKE '%' || _district || '%')
    AND (
      _search IS NULL OR
      fr.registration_no ILIKE '%' || _search || '%' OR
      fr.applicant_name ILIKE '%' || _search || '%' OR
      fr.company_name ILIKE '%' || _search || '%' OR
      fr.mobile ILIKE '%' || _search || '%' OR
      fr.email ILIKE '%' || _search || '%'
    )
  ORDER BY payment_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_franchise_payment_ledger(timestamptz, timestamptz, text, text, text) TO authenticated, service_role;