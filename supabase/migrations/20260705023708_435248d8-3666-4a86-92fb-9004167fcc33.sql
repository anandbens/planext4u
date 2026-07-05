
-- ============================================================
-- Coupon Module: Normalized Enterprise Foundation (Additive)
-- ============================================================
-- Extends existing coupon_campaigns / coupon_codes / coupon_redemptions
-- / coupon_audit_log / coupon_popup_dismissals with normalized mapping,
-- history, notifications, analytics and popup configuration tables.
-- No existing tables are dropped or altered destructively.
-- ============================================================

-- --- Extend coupon_codes with enterprise lifecycle columns ---
ALTER TABLE public.coupon_codes
  ADD COLUMN IF NOT EXISTS assigned_customer_id text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS redemption_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS coupon_codes_code_unique ON public.coupon_codes (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS coupon_codes_campaign_status_idx ON public.coupon_codes (campaign_id, status);
CREATE INDEX IF NOT EXISTS coupon_codes_assigned_customer_idx ON public.coupon_codes (assigned_customer_id);
CREATE INDEX IF NOT EXISTS coupon_codes_expires_at_idx ON public.coupon_codes (expires_at);
CREATE INDEX IF NOT EXISTS coupon_codes_batch_idx ON public.coupon_codes (batch_number);

-- --- Extend coupon_campaigns audit columns ---
ALTER TABLE public.coupon_campaigns
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS coupon_campaigns_status_idx ON public.coupon_campaigns (status);
CREATE INDEX IF NOT EXISTS coupon_campaigns_dates_idx ON public.coupon_campaigns (starts_at, expires_at);

-- ============================================================
-- 1. Coupon Vendor Mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_vendor_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  vendor_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (campaign_id, coupon_code_id, vendor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_vendor_mapping TO authenticated;
GRANT SELECT ON public.coupon_vendor_mapping TO anon;
GRANT ALL ON public.coupon_vendor_mapping TO service_role;
ALTER TABLE public.coupon_vendor_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cvm_public_read" ON public.coupon_vendor_mapping FOR SELECT USING (true);
CREATE POLICY "cvm_admin_write" ON public.coupon_vendor_mapping FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS cvm_vendor_idx ON public.coupon_vendor_mapping (vendor_id);
CREATE INDEX IF NOT EXISTS cvm_campaign_idx ON public.coupon_vendor_mapping (campaign_id);

-- ============================================================
-- 2. Coupon Product Mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_product_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (campaign_id, coupon_code_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_product_mapping TO authenticated;
GRANT SELECT ON public.coupon_product_mapping TO anon;
GRANT ALL ON public.coupon_product_mapping TO service_role;
ALTER TABLE public.coupon_product_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpm_public_read" ON public.coupon_product_mapping FOR SELECT USING (true);
CREATE POLICY "cpm_admin_write" ON public.coupon_product_mapping FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS cpm_product_idx ON public.coupon_product_mapping (product_id);
CREATE INDEX IF NOT EXISTS cpm_campaign_idx ON public.coupon_product_mapping (campaign_id);

-- ============================================================
-- 3. Coupon Customer Mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_customer_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  assignment_date timestamptz NOT NULL DEFAULT now(),
  usage_status text NOT NULL DEFAULT 'assigned', -- assigned|applied|redeemed|expired|cancelled
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (campaign_id, coupon_code_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_customer_mapping TO authenticated;
GRANT ALL ON public.coupon_customer_mapping TO service_role;
ALTER TABLE public.coupon_customer_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccm_admin_all" ON public.coupon_customer_mapping FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ccm_customer_read_own" ON public.coupon_customer_mapping FOR SELECT
  USING (customer_id = auth.uid()::text);
CREATE INDEX IF NOT EXISTS ccm_customer_idx ON public.coupon_customer_mapping (customer_id);
CREATE INDEX IF NOT EXISTS ccm_campaign_idx ON public.coupon_customer_mapping (campaign_id);

-- ============================================================
-- 4. Coupon Geo Mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_geo_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  state text,
  district text,
  city text,
  pincode text,
  latitude double precision,
  longitude double precision,
  radius_km numeric,
  vendor_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_geo_mapping TO authenticated;
GRANT SELECT ON public.coupon_geo_mapping TO anon;
GRANT ALL ON public.coupon_geo_mapping TO service_role;
ALTER TABLE public.coupon_geo_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cgm_public_read" ON public.coupon_geo_mapping FOR SELECT USING (true);
CREATE POLICY "cgm_admin_write" ON public.coupon_geo_mapping FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS cgm_campaign_idx ON public.coupon_geo_mapping (campaign_id);
CREATE INDEX IF NOT EXISTS cgm_district_idx ON public.coupon_geo_mapping (district);
CREATE INDEX IF NOT EXISTS cgm_pincode_idx ON public.coupon_geo_mapping (pincode);
CREATE INDEX IF NOT EXISTS cgm_vendor_idx ON public.coupon_geo_mapping (vendor_id);

-- ============================================================
-- 5. Coupon Usage History (denormalized per-line for reporting)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_usage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.coupon_campaigns(id) ON DELETE SET NULL,
  code text,
  customer_id text,
  order_id text,
  vendor_id text,
  product_id uuid,
  discount_percent numeric,
  discount_amount numeric NOT NULL DEFAULT 0,
  order_amount numeric NOT NULL DEFAULT 0,
  applied_at timestamptz,
  redeemed_at timestamptz,
  status text NOT NULL DEFAULT 'applied',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_usage_history TO authenticated;
GRANT ALL ON public.coupon_usage_history TO service_role;
ALTER TABLE public.coupon_usage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cuh_admin_all" ON public.coupon_usage_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cuh_customer_read_own" ON public.coupon_usage_history FOR SELECT
  USING (customer_id = auth.uid()::text);
CREATE INDEX IF NOT EXISTS cuh_campaign_idx ON public.coupon_usage_history (campaign_id);
CREATE INDEX IF NOT EXISTS cuh_customer_idx ON public.coupon_usage_history (customer_id);
CREATE INDEX IF NOT EXISTS cuh_order_idx ON public.coupon_usage_history (order_id);
CREATE INDEX IF NOT EXISTS cuh_vendor_idx ON public.coupon_usage_history (vendor_id);
CREATE INDEX IF NOT EXISTS cuh_product_idx ON public.coupon_usage_history (product_id);
CREATE INDEX IF NOT EXISTS cuh_status_idx ON public.coupon_usage_history (status);
CREATE INDEX IF NOT EXISTS cuh_code_idx ON public.coupon_usage_history (code);

-- ============================================================
-- 6. Coupon Rollback History
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_rollback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.coupon_campaigns(id) ON DELETE SET NULL,
  code text,
  order_id text,
  refund_id text,
  old_status text,
  new_status text,
  rollback_reason text,
  rolled_back_by uuid,
  rolled_back_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_rollback_history TO authenticated;
GRANT ALL ON public.coupon_rollback_history TO service_role;
ALTER TABLE public.coupon_rollback_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crh_admin_all" ON public.coupon_rollback_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS crh_code_idx ON public.coupon_rollback_history (coupon_code_id);
CREATE INDEX IF NOT EXISTS crh_campaign_idx ON public.coupon_rollback_history (campaign_id);
CREATE INDEX IF NOT EXISTS crh_order_idx ON public.coupon_rollback_history (order_id);

-- ============================================================
-- 7. Coupon Popup Configuration (extended targeting per campaign)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_popup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  popup_image_url text,
  popup_title text,
  popup_description text,
  popup_frequency text NOT NULL DEFAULT 'once_per_session', -- once|once_per_session|daily|always
  dismiss_allowed boolean NOT NULL DEFAULT true,
  display_priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_popup_config TO authenticated;
GRANT SELECT ON public.coupon_popup_config TO anon;
GRANT ALL ON public.coupon_popup_config TO service_role;
ALTER TABLE public.coupon_popup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpc_public_read" ON public.coupon_popup_config FOR SELECT USING (is_active = true);
CREATE POLICY "cpc_admin_write" ON public.coupon_popup_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS cpc_priority_idx ON public.coupon_popup_config (display_priority DESC);

-- ============================================================
-- 8. Coupon Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL, -- issued|expiring|expired|redeemed|rolled_back
  coupon_code_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.coupon_campaigns(id) ON DELETE SET NULL,
  customer_id text,
  sms_status text NOT NULL DEFAULT 'pending',   -- pending|sent|failed|skipped
  email_status text NOT NULL DEFAULT 'pending',
  push_status text NOT NULL DEFAULT 'pending',
  whatsapp_status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_notifications TO authenticated;
GRANT ALL ON public.coupon_notifications TO service_role;
ALTER TABLE public.coupon_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cn_admin_all" ON public.coupon_notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cn_customer_read_own" ON public.coupon_notifications FOR SELECT
  USING (customer_id = auth.uid()::text);
CREATE INDEX IF NOT EXISTS cn_customer_idx ON public.coupon_notifications (customer_id);
CREATE INDEX IF NOT EXISTS cn_campaign_idx ON public.coupon_notifications (campaign_id);
CREATE INDEX IF NOT EXISTS cn_type_idx ON public.coupon_notifications (notification_type);

-- ============================================================
-- 9. Coupon Analytics (rolled-up per campaign)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  coupons_generated integer NOT NULL DEFAULT 0,
  coupons_used integer NOT NULL DEFAULT 0,
  coupons_expired integer NOT NULL DEFAULT 0,
  coupons_available integer NOT NULL DEFAULT 0,
  coupons_rolled_back integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  discount_given numeric NOT NULL DEFAULT 0,
  roi numeric NOT NULL DEFAULT 0,
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_analytics TO authenticated;
GRANT ALL ON public.coupon_analytics TO service_role;
ALTER TABLE public.coupon_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_admin_all" ON public.coupon_analytics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Extend coupon_audit_log with client-context columns
-- ============================================================
ALTER TABLE public.coupon_audit_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS coupon_audit_event_idx ON public.coupon_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS coupon_audit_campaign_idx ON public.coupon_audit_log (campaign_id);
CREATE INDEX IF NOT EXISTS coupon_audit_code_idx ON public.coupon_audit_log (coupon_code_id);

-- ============================================================
-- updated_at triggers (reuse global function if present)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_coupon_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'coupon_vendor_mapping','coupon_product_mapping','coupon_customer_mapping',
    'coupon_geo_mapping','coupon_usage_history','coupon_popup_config',
    'coupon_notifications','coupon_analytics','coupon_codes'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_coupon_touch_updated_at()', t, t);
  END LOOP;
END $$;
