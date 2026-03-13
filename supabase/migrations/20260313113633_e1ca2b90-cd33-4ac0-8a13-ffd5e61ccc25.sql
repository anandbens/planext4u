
-- Activity logs table for database state change tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  type text NOT NULL,
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert activity logs"
ON public.activity_logs FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read activity logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read activity logs"
ON public.activity_logs FOR SELECT TO anon
USING (true);

-- Customer addresses table
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  type text NOT NULL DEFAULT 'home',
  address_line text NOT NULL,
  city text NOT NULL DEFAULT '',
  pincode text NOT NULL DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public CRUD on customer addresses"
ON public.customer_addresses FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);
