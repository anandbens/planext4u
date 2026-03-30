CREATE TABLE public.email_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'discount_banner',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.email_subscriptions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read subscriptions" ON public.email_subscriptions
  FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));

CREATE POLICY "Anon can read subscriptions" ON public.email_subscriptions
  FOR SELECT TO anon USING (true);