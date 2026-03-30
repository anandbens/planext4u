
-- Saved searches table
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved searches public read" ON public.saved_searches FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert saved searches" ON public.saved_searches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can delete saved searches" ON public.saved_searches FOR DELETE TO authenticated USING (true);
CREATE POLICY "Admins can manage saved searches" ON public.saved_searches FOR ALL TO authenticated USING (is_admin_user(auth.uid()));

-- Property messages table
CREATE TABLE public.property_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  sender_name text DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.property_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages public read" ON public.property_messages FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert messages" ON public.property_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update messages" ON public.property_messages FOR UPDATE TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_messages;

-- Rent payments table
CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_title text NOT NULL DEFAULT '',
  landlord_name text DEFAULT '',
  landlord_phone text DEFAULT '',
  monthly_rent numeric NOT NULL DEFAULT 0,
  due_date integer NOT NULL DEFAULT 1,
  paid_months jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rent payments public read" ON public.rent_payments FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert rent payments" ON public.rent_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update rent payments" ON public.rent_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete rent payments" ON public.rent_payments FOR DELETE TO authenticated USING (true);
