-- Customers: allow 'deleted' and 'deactivated' statuses (used by admin soft-delete and self-deactivation flow)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check
  CHECK (status = ANY (ARRAY['active','inactive','suspended','deactivated','deleted']));

-- Vendors: allow 'deleted','active','suspended' alongside the existing approval-lifecycle states
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_status_check
  CHECK (status = ANY (ARRAY[
    'pending','level1_approved','level2_approved','verified','rejected',
    'active','inactive','suspended','deleted'
  ]));