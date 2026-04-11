-- Fix vendor_applications: restrict SELECT to own or admin
DROP POLICY IF EXISTS "Users can view vendor apps" ON public.vendor_applications;
CREATE POLICY "Users can view own vendor apps"
ON public.vendor_applications FOR SELECT TO authenticated
USING (user_id = auth.uid()::text OR public.is_admin_user(auth.uid()));

-- Allow anon to check if phone exists (needed for registration check) but not read full data
-- No anon SELECT policy needed

-- Fix vendor_applications: restrict UPDATE to own or admin (re-drop in case prior migration partially applied)
DROP POLICY IF EXISTS "Users can update own vendor apps" ON public.vendor_applications;
CREATE POLICY "Users can update own vendor apps"
ON public.vendor_applications FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text OR public.is_admin_user(auth.uid()))
WITH CHECK (user_id = auth.uid()::text OR public.is_admin_user(auth.uid()));

-- Fix activity_logs: remove anon read
DROP POLICY IF EXISTS "Public read activity logs" ON public.activity_logs;

-- Fix property_messages: remove public read
DROP POLICY IF EXISTS "Messages public read" ON public.property_messages;
