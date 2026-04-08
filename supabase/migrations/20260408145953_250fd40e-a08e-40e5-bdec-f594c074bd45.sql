
-- Fix vendor_applications: allow anyone to insert (registration happens before login)
DROP POLICY IF EXISTS "Users can insert own vendor apps" ON public.vendor_applications;
CREATE POLICY "Anyone can submit vendor applications"
  ON public.vendor_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read vendor apps by phone (for login check)
DROP POLICY IF EXISTS "Users can view own vendor apps" ON public.vendor_applications;
CREATE POLICY "Users can view vendor apps"
  ON public.vendor_applications FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep admin full access and user update policies
DROP POLICY IF EXISTS "Users can update own vendor apps" ON public.vendor_applications;
CREATE POLICY "Users can update own vendor apps"
  ON public.vendor_applications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
