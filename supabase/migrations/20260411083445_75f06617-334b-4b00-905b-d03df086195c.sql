
-- Fix vendor_applications: restrict update to own apps or admins
DROP POLICY IF EXISTS "Users can update own vendor apps" ON public.vendor_applications;
CREATE POLICY "Users can update own vendor apps"
ON public.vendor_applications FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text OR public.is_admin_user(auth.uid()))
WITH CHECK (user_id = auth.uid()::text OR public.is_admin_user(auth.uid()));

-- Fix user_devices: remove duplicate, restrict to own devices
DROP POLICY IF EXISTS "Users can manage own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users manage own devices" ON public.user_devices;
CREATE POLICY "Users manage own devices"
ON public.user_devices FOR ALL TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Fix property_messages: restrict updates to sender
DROP POLICY IF EXISTS "Auth users can update messages" ON public.property_messages;
CREATE POLICY "Auth users can update own messages"
ON public.property_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid()::text);

-- Fix saved_searches: restrict deletes to own searches
DROP POLICY IF EXISTS "Auth users can delete saved searches" ON public.saved_searches;
CREATE POLICY "Auth users can delete own saved searches"
ON public.saved_searches FOR DELETE TO authenticated
USING (user_id = auth.uid()::text);
