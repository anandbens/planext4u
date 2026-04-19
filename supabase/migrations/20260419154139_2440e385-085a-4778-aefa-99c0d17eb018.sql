-- Soft-delete support for orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);

-- Allow vendors and customers to keep reading their non-deleted orders, while admins still see everything.
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    (
      (customer_id = get_customer_id(auth.uid()) OR vendor_id = get_vendor_id(auth.uid()))
      AND deleted_at IS NULL
    )
    OR is_admin_user(auth.uid())
  );