
CREATE TABLE public.splash_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  tagline TEXT DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  background_color TEXT NOT NULL DEFAULT '#009999',
  app_type TEXT NOT NULL DEFAULT 'both' CHECK (app_type IN ('customer', 'vendor', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.splash_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Splash screens are publicly readable"
ON public.splash_screens FOR SELECT USING (true);

CREATE POLICY "Admins can manage splash screens"
ON public.splash_screens FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));
