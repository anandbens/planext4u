
-- Allow customers to insert their own support tickets
CREATE POLICY "Customers can create own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

-- Allow customers to update their own tickets (e.g. add more info)
CREATE POLICY "Customers can update own tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (customer_id = public.get_customer_id(auth.uid()));
