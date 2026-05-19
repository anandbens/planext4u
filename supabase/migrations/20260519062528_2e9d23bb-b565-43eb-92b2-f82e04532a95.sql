
CREATE OR REPLACE FUNCTION public.track_ad_impression(_ad_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.advertisements
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = _ad_id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.track_ad_click(_ad_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.advertisements
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = _ad_id AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.track_ad_impression(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_ad_click(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read otp_requests" ON public.otp_requests;
DROP POLICY IF EXISTS "Anyone can update otp_requests" ON public.otp_requests;
DROP POLICY IF EXISTS "Anyone can insert otp_requests" ON public.otp_requests;
