
-- 1. Create helper function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_conversations
    WHERE id = _conversation_id
      AND participants @> to_jsonb(ARRAY[_user_id::text])
  )
$$;

-- 2. Fix social_messages
DROP POLICY IF EXISTS "Auth manage social_messages" ON public.social_messages;
DROP POLICY IF EXISTS "Public read social_messages" ON public.social_messages;

CREATE POLICY "Users read own conversation messages" ON public.social_messages
  FOR SELECT TO authenticated
  USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users send messages in own conversations" ON public.social_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users delete own messages" ON public.social_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Admins manage social_messages" ON public.social_messages
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 3. Fix social_conversations
DROP POLICY IF EXISTS "Auth manage social_conversations" ON public.social_conversations;

CREATE POLICY "Users read own conversations" ON public.social_conversations
  FOR SELECT TO authenticated
  USING (participants @> to_jsonb(ARRAY[auth.uid()::text]));

CREATE POLICY "Users create conversations" ON public.social_conversations
  FOR INSERT TO authenticated
  WITH CHECK (participants @> to_jsonb(ARRAY[auth.uid()::text]));

CREATE POLICY "Users update own conversations" ON public.social_conversations
  FOR UPDATE TO authenticated
  USING (participants @> to_jsonb(ARRAY[auth.uid()::text]));

CREATE POLICY "Admins manage social_conversations" ON public.social_conversations
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 4. Fix properties insert
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;

CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_customer_id(auth.uid()));

-- 5. Make social-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'social-media';

-- 6. Storage policies for social-media bucket
CREATE POLICY "Users upload to own social folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own social media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'social-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own social media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'social-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated read social media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'social-media');

-- 7. Fix customer_addresses
DROP POLICY IF EXISTS "Public CRUD on customer addresses" ON public.customer_addresses;

CREATE POLICY "Customers manage own addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (customer_id = get_customer_id(auth.uid()))
  WITH CHECK (customer_id = get_customer_id(auth.uid()));

CREATE POLICY "Admins manage all addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 8. Fix rent_payments
DROP POLICY IF EXISTS "Auth users can delete rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Auth users can insert rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Auth users can update rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Rent payments public read" ON public.rent_payments;

CREATE POLICY "Users manage own rent payments" ON public.rent_payments
  FOR ALL TO authenticated
  USING (user_id = get_customer_id(auth.uid()))
  WITH CHECK (user_id = get_customer_id(auth.uid()));

CREATE POLICY "Admins manage all rent payments" ON public.rent_payments
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
