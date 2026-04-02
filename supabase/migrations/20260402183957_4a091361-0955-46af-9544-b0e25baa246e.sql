
-- Add customer self-update policy
DROP POLICY IF EXISTS "Customers read own record" ON public.customers;
DROP POLICY IF EXISTS "Admins read all customers" ON public.customers;
DROP POLICY IF EXISTS "Customers are publicly readable" ON public.customers;

CREATE POLICY "Customers read own record" ON public.customers
  FOR SELECT TO authenticated
  USING (id = get_customer_id(auth.uid()));

CREATE POLICY "Admins read all customers" ON public.customers
  FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

-- Customer can update own record
CREATE POLICY "Customers update own record" ON public.customers
  FOR UPDATE TO authenticated
  USING (id = get_customer_id(auth.uid()))
  WITH CHECK (id = get_customer_id(auth.uid()));
