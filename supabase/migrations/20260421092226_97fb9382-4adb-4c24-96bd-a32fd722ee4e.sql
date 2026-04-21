-- ── Extend platform_settings ─────────────────────────────────────
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS odoo_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropshipping_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── Odoo Config ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.odoo_config (
  id INT PRIMARY KEY DEFAULT 1,
  base_url TEXT,
  database_name TEXT,
  username TEXT,
  api_key_secret_name TEXT DEFAULT 'ODOO_API_KEY',
  sync_orders BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_shipments BOOLEAN NOT NULL DEFAULT true,
  sync_customers BOOLEAN NOT NULL DEFAULT false,
  default_warehouse_id TEXT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT odoo_config_singleton CHECK (id = 1)
);

INSERT INTO public.odoo_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.odoo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage odoo_config"
  ON public.odoo_config FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_odoo_config_updated
  BEFORE UPDATE ON public.odoo_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Odoo Sync Log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.odoo_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'order' | 'product' | 'customer' | 'shipment' | 'inventory'
  entity_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound', -- 'outbound' | 'inbound'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
  odoo_record_id TEXT,
  payload JSONB,
  response JSONB,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_odoo_sync_log_entity ON public.odoo_sync_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_log_status ON public.odoo_sync_log (status, created_at DESC);

ALTER TABLE public.odoo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read odoo_sync_log"
  ON public.odoo_sync_log FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Service role can insert odoo_sync_log"
  ON public.odoo_sync_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ── Dropshipping Suppliers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dropshipping_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  country_code TEXT REFERENCES public.countries(code) ON DELETE SET NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  website TEXT,
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  default_lead_time_days INT NOT NULL DEFAULT 7,
  default_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  shipping_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'archived'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dropshipping_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dropshipping_suppliers"
  ON public.dropshipping_suppliers FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors read active dropshipping_suppliers"
  ON public.dropshipping_suppliers FOR SELECT TO authenticated
  USING (status = 'active' AND public.get_vendor_id(auth.uid()) IS NOT NULL);

CREATE TRIGGER trg_dropshipping_suppliers_updated
  BEFORE UPDATE ON public.dropshipping_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Supplier ↔ Product Mapping ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dropshipping_supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.dropshipping_suppliers(id) ON DELETE CASCADE,
  product_id TEXT, -- references public.products(id), nullable until linked
  supplier_sku TEXT NOT NULL,
  supplier_product_name TEXT,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  moq INT NOT NULL DEFAULT 1,
  stock_buffer INT NOT NULL DEFAULT 0,
  available_stock INT,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, supplier_sku)
);

CREATE INDEX IF NOT EXISTS idx_dss_product ON public.dropshipping_supplier_products (product_id);

ALTER TABLE public.dropshipping_supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage supplier_products"
  ON public.dropshipping_supplier_products FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors read active supplier_products"
  ON public.dropshipping_supplier_products FOR SELECT TO authenticated
  USING (is_active = true AND public.get_vendor_id(auth.uid()) IS NOT NULL);

CREATE TRIGGER trg_dss_updated
  BEFORE UPDATE ON public.dropshipping_supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Dropshipping Orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dropshipping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL, -- references public.orders(id)
  vendor_id TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.dropshipping_suppliers(id) ON DELETE RESTRICT,
  supplier_order_ref TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | submitted | confirmed | shipped | delivered | cancelled | failed
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  forwarded_at TIMESTAMPTZ,
  expected_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ds_orders_order ON public.dropshipping_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_ds_orders_vendor ON public.dropshipping_orders (vendor_id);
CREATE INDEX IF NOT EXISTS idx_ds_orders_status ON public.dropshipping_orders (status, created_at DESC);

ALTER TABLE public.dropshipping_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dropshipping_orders"
  ON public.dropshipping_orders FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors read own dropshipping_orders"
  ON public.dropshipping_orders FOR SELECT TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()));

CREATE TRIGGER trg_ds_orders_updated
  BEFORE UPDATE ON public.dropshipping_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Per-Vendor Dropshipping Settings ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_dropshipping_settings (
  vendor_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_supplier_id UUID REFERENCES public.dropshipping_suppliers(id) ON DELETE SET NULL,
  auto_forward_orders BOOLEAN NOT NULL DEFAULT false,
  default_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  notify_on_status_change BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_dropshipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vendor_dropshipping_settings"
  ON public.vendor_dropshipping_settings FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Vendors manage own dropshipping settings"
  ON public.vendor_dropshipping_settings FOR ALL TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));

CREATE TRIGGER trg_vds_updated
  BEFORE UPDATE ON public.vendor_dropshipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();