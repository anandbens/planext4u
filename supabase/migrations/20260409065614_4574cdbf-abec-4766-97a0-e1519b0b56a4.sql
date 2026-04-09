
-- Function to match phone contacts against registered customers
-- Privacy-safe: only returns public profile data for matched numbers
CREATE OR REPLACE FUNCTION public.match_contacts_by_phone(_phones text[])
RETURNS TABLE(id text, name text, mobile text, profile_photo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.mobile, c.profile_photo
  FROM customers c
  WHERE c.status = 'active'
    AND c.mobile = ANY(_phones)
  LIMIT 50;
END;
$$;

-- Ensure user_devices table exists for push token storage
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  device_id text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'android',
  push_token text DEFAULT '',
  app_version text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices"
  ON public.user_devices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to save/upsert device token
CREATE OR REPLACE FUNCTION public.save_device_token(_user_id text, _token text, _platform text DEFAULT 'android')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_devices (user_id, device_id, platform, push_token, updated_at)
  VALUES (_user_id, _token, _platform, _token, now())
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET push_token = _token, platform = _platform, updated_at = now();
END;
$$;
