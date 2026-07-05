CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers (mobile);
CREATE INDEX IF NOT EXISTS idx_customers_mobile_status_created ON public.customers (mobile, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_customer_role ON public.user_roles (customer_id, role) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_vendor_role ON public.user_roles (vendor_id, role) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile_status_created ON public.vendors (mobile, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_vendors_mobile_status_created ON public.service_vendors (mobile, status, created_at DESC);