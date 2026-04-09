
CREATE TABLE public.otp_requests (
  phone_number text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/authenticated users to select and upsert their own records
CREATE POLICY "Anyone can read otp_requests"
  ON public.otp_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert otp_requests"
  ON public.otp_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update otp_requests"
  ON public.otp_requests FOR UPDATE
  USING (true);

-- Function to check and increment OTP requests atomically
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec otp_requests%ROWTYPE;
  diff_seconds double precision;
  result jsonb;
BEGIN
  SELECT * INTO rec FROM otp_requests WHERE phone_number = _phone FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO otp_requests (phone_number, request_count, last_requested_at)
    VALUES (_phone, 1, now());
    RETURN jsonb_build_object('allowed', true, 'remaining', 2, 'retry_after', 0);
  END IF;

  diff_seconds := EXTRACT(EPOCH FROM (now() - rec.last_requested_at));

  IF diff_seconds > 300 THEN
    UPDATE otp_requests SET request_count = 1, last_requested_at = now()
    WHERE phone_number = _phone;
    RETURN jsonb_build_object('allowed', true, 'remaining', 2, 'retry_after', 0);
  END IF;

  IF rec.request_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', CEIL(300 - diff_seconds)::int
    );
  END IF;

  UPDATE otp_requests SET request_count = request_count + 1, last_requested_at = now()
  WHERE phone_number = _phone;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', 2 - rec.request_count,
    'retry_after', 0
  );
END;
$$;
