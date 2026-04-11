-- Allow vendors to insert themselves into service_vendors
CREATE POLICY "Vendors can insert own service_vendor record"
ON public.service_vendors FOR INSERT TO authenticated
WITH CHECK (id = public.get_vendor_id(auth.uid()));

-- Allow vendors to update their own service_vendor record
CREATE POLICY "Vendors can update own service_vendor"
ON public.service_vendors FOR UPDATE TO authenticated
USING (id = public.get_vendor_id(auth.uid()));