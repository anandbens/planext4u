-- 1. Fix products status check to allow pending_approval and rejected
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check 
  CHECK (status = ANY (ARRAY['active','inactive','draft','pending_approval','rejected']));

-- 2. Fix services status check to allow pending_approval and rejected
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE public.services ADD CONSTRAINT services_status_check 
  CHECK (status = ANY (ARRAY['active','inactive','draft','pending_approval','rejected']));

-- 3. Fix customer_addresses RLS - allow insert when customer_id = auth.uid()::text directly
DROP POLICY IF EXISTS "Customers manage own addresses" ON public.customer_addresses;
CREATE POLICY "Customers manage own addresses" ON public.customer_addresses
  FOR ALL USING (
    customer_id = auth.uid()::text 
    OR customer_id = get_customer_id(auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid()::text 
    OR customer_id = get_customer_id(auth.uid())
  );