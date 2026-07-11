
-- Public vendor application submission
CREATE OR REPLACE FUNCTION public.submit_public_vendor_application(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.vendor_applications (
    user_id, name, phone, secondary_phone, email, state, city, district, postal_code,
    fb_link, instagram_link, business_name, business_type, store_name, category,
    vendor_category, business_description, gst_number, gst_certificate_url,
    pan_number, pan_image_url, aadhaar_number, aadhaar_front_url, aadhaar_back_url,
    bank_account_number, bank_ifsc, bank_holder_name, store_logo_url,
    latitude, longitude, shop_address, referred_by, status, admin_notes
  )
  VALUES (
    payload->>'user_id', payload->>'name', payload->>'phone', payload->>'secondary_phone',
    payload->>'email', payload->>'state', payload->>'city', payload->>'district', payload->>'postal_code',
    payload->>'fb_link', payload->>'instagram_link', payload->>'business_name', payload->>'business_type',
    payload->>'store_name', payload->>'category', payload->>'vendor_category',
    payload->>'business_description', payload->>'gst_number', payload->>'gst_certificate_url',
    payload->>'pan_number', payload->>'pan_image_url', payload->>'aadhaar_number',
    payload->>'aadhaar_front_url', payload->>'aadhaar_back_url',
    payload->>'bank_account_number', payload->>'bank_ifsc', payload->>'bank_holder_name',
    payload->>'store_logo_url',
    NULLIF(payload->>'latitude','')::numeric, NULLIF(payload->>'longitude','')::numeric,
    payload->>'shop_address', payload->>'referred_by',
    COALESCE(payload->>'status','submitted'),
    payload->>'admin_notes'
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Public franchise registration submission
CREATE OR REPLACE FUNCTION public.submit_public_franchise_registration(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
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
    COALESCE(payload->>'status','submitted')
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Public payment record attach for a fresh vendor/franchise submission
CREATE OR REPLACE FUNCTION public.record_public_registration_payment(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  ent_type payment_entity_type;
  pay_mode text;
  pay_status text;
BEGIN
  ent_type := (payload->>'entity_type')::payment_entity_type;
  pay_mode := payload->>'payment_mode';
  pay_status := COALESCE(payload->>'payment_status','pending');

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
    pay_mode::payment_mode,
    pay_status::payment_status,
    payload->>'transaction_ref',
    NULLIF(payload->>'payment_date','')::timestamptz,
    payload->>'remarks',
    COALESCE(payload->'metadata', '{}'::jsonb)
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_vendor_application(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_franchise_registration(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_registration_payment(jsonb) TO anon, authenticated;
