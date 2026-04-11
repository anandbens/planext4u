-- Allow vendors to read their own orders
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = get_customer_id(auth.uid())
    OR vendor_id = get_vendor_id(auth.uid())
    OR is_admin_user(auth.uid())
  );

-- Allow vendors to update their own orders (status changes)
CREATE POLICY "Vendors can update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = get_vendor_id(auth.uid()));