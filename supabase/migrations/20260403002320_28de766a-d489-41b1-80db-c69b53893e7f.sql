
-- Onboarding screens managed by admin
CREATE TABLE public.onboarding_screens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage onboarding_screens"
  ON public.onboarding_screens FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Public read active onboarding_screens"
  ON public.onboarding_screens FOR SELECT TO public
  USING (true);

CREATE TRIGGER update_onboarding_screens_updated_at
  BEFORE UPDATE ON public.onboarding_screens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User devices for tracking
CREATE TABLE public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  device_id text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'web',
  push_token text DEFAULT '',
  onboarding_completed boolean NOT NULL DEFAULT false,
  first_login timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devices"
  ON public.user_devices FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins read all devices"
  ON public.user_devices FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));
