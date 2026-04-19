
-- ============================================================
-- 1. INVOICE SEQUENCES (per-vendor, per-FY, per-doc-type)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  fy_start int NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('invoice','credit_note','platform_fee')),
  last_value bigint NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'P4U',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, fy_start, doc_type)
);
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice_sequences" ON public.invoice_sequences
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_invoice_number(_vendor_id text, _doc_type text, _fy_start int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _seq bigint;
  _vendor_code text;
  _fy_label text;
  _prefix text;
BEGIN
  -- get short vendor code (first 6 alphanumeric chars of vendor_id)
  _vendor_code := upper(substring(regexp_replace(_vendor_id, '[^a-zA-Z0-9]', '', 'g'), 1, 6));
  _fy_label := substring(_fy_start::text, 3, 2) || substring((_fy_start+1)::text, 3, 2);

  INSERT INTO public.invoice_sequences (vendor_id, fy_start, doc_type, last_value)
  VALUES (_vendor_id, _fy_start, _doc_type, 1)
  ON CONFLICT (vendor_id, fy_start, doc_type)
  DO UPDATE SET last_value = invoice_sequences.last_value + 1, updated_at = now()
  RETURNING last_value INTO _seq;

  _prefix := CASE _doc_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'credit_note' THEN 'CN'
    WHEN 'platform_fee' THEN 'PF'
    ELSE 'DOC'
  END;

  -- Format: INV-<VENDOR6>-<FY4>-<00001>  → max 16 chars when vendor_code ≤4
  RETURN _prefix || '-' || _vendor_code || _fy_label || '-' || lpad(_seq::text, 5, '0');
END $$;

-- ============================================================
-- 2. ORDER INVOICES (vendor → customer tax invoice)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  fy_start int NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),

  -- supplier (vendor)
  vendor_id text NOT NULL,
  vendor_name text,
  vendor_gstin text,
  vendor_pan text,
  vendor_address text,
  vendor_state text,
  vendor_state_code text,

  -- recipient (customer)
  customer_id text NOT NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  place_of_supply_state text,
  place_of_supply_code text,
  is_interstate boolean NOT NULL DEFAULT false,

  -- amounts
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  taxable_value numeric(12,2) NOT NULL DEFAULT 0,
  cgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  igst_amount numeric(12,2) NOT NULL DEFAULT 0,
  cess_amount numeric(12,2) NOT NULL DEFAULT 0,
  tcs_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  round_off numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount_in_words text,

  pdf_url text,
  emailed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order ON public.order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_vendor_fy ON public.order_invoices(vendor_id, fy_start);
CREATE INDEX IF NOT EXISTS idx_order_invoices_date ON public.order_invoices(invoice_date);
ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage order_invoices" ON public.order_invoices
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Customers read own invoices" ON public.order_invoices
  FOR SELECT TO authenticated USING (customer_id = get_customer_id(auth.uid()));
CREATE POLICY "Vendors read own invoices" ON public.order_invoices
  FOR SELECT TO authenticated USING (vendor_id = get_vendor_id(auth.uid()));

-- ============================================================
-- 3. PLATFORM FEE INVOICES (P4U → customer/vendor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  fy_start int NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  bill_to text NOT NULL DEFAULT 'customer' CHECK (bill_to IN ('customer','vendor')),
  recipient_id text NOT NULL,
  recipient_name text,
  recipient_gstin text,
  recipient_state_code text,
  is_interstate boolean NOT NULL DEFAULT false,

  taxable_value numeric(12,2) NOT NULL DEFAULT 0,
  gst_rate numeric(5,2) NOT NULL DEFAULT 18,
  cgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  igst_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  sac_code text NOT NULL DEFAULT '999799',  -- support / facilitation services
  description text NOT NULL DEFAULT 'Marketplace facilitation fee',
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_invoices_order ON public.platform_fee_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_pf_invoices_date ON public.platform_fee_invoices(invoice_date);
ALTER TABLE public.platform_fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pf_invoices" ON public.platform_fee_invoices
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Recipients read own pf_invoices" ON public.platform_fee_invoices
  FOR SELECT TO authenticated USING (
    (bill_to = 'customer' AND recipient_id = get_customer_id(auth.uid()))
    OR (bill_to = 'vendor' AND recipient_id = get_vendor_id(auth.uid()))
  );

-- ============================================================
-- 4. CREDIT NOTES (cancellations / returns)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_no text NOT NULL UNIQUE,
  original_invoice_id uuid REFERENCES public.order_invoices(id) ON DELETE RESTRICT,
  original_invoice_no text,
  order_id text REFERENCES public.orders(id) ON DELETE RESTRICT,
  fy_start int NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  vendor_id text NOT NULL,
  vendor_gstin text,
  customer_id text NOT NULL,
  customer_name text,
  reason text NOT NULL DEFAULT 'cancellation',  -- cancellation | return | price_revision | other
  notes text,

  taxable_value numeric(12,2) NOT NULL DEFAULT 0,
  cgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(12,2) NOT NULL DEFAULT 0,
  igst_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  is_interstate boolean NOT NULL DEFAULT false,
  place_of_supply_code text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cn_order ON public.credit_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_cn_vendor_fy ON public.credit_notes(vendor_id, fy_start);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage credit_notes" ON public.credit_notes
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Customers read own credit_notes" ON public.credit_notes
  FOR SELECT TO authenticated USING (customer_id = get_customer_id(auth.uid()));
CREATE POLICY "Vendors read own credit_notes" ON public.credit_notes
  FOR SELECT TO authenticated USING (vendor_id = get_vendor_id(auth.uid()));

-- ============================================================
-- 5. ORDER PAYMENTS (gateway transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text,
  payment_provider text NOT NULL DEFAULT 'razorpay',
  txn_type text NOT NULL DEFAULT 'capture' CHECK (txn_type IN ('order','authorize','capture','refund','failed')),
  status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  razorpay_refund_id text,
  gateway_fee numeric(12,2) DEFAULT 0,
  gateway_gst numeric(12,2) DEFAULT 0,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_op_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_op_status ON public.order_payments(status);
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage order_payments" ON public.order_payments
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Customers read own order_payments" ON public.order_payments
  FOR SELECT TO authenticated USING (customer_id = get_customer_id(auth.uid()));

-- ============================================================
-- 6. ORDER REFUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  credit_note_id uuid REFERENCES public.credit_notes(id),
  customer_id text NOT NULL,
  amount numeric(12,2) NOT NULL,
  reason text NOT NULL DEFAULT 'order_cancelled',
  refund_method text NOT NULL DEFAULT 'original' CHECK (refund_method IN ('original','wallet','bank_transfer')),
  status text NOT NULL DEFAULT 'pending',
  razorpay_refund_id text,
  initiated_by uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_or_order ON public.order_refunds(order_id);
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage order_refunds" ON public.order_refunds
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Customers read own order_refunds" ON public.order_refunds
  FOR SELECT TO authenticated USING (customer_id = get_customer_id(auth.uid()));

-- ============================================================
-- 7. SETTLEMENTS — extend with full tax breakup
-- ============================================================
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS gross_sales numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_collected numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_collected numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_collected numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_on_commission numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tcs_deducted numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_deducted numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payable_to_vendor numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_period_from date,
  ADD COLUMN IF NOT EXISTS settlement_period_to date,
  ADD COLUMN IF NOT EXISTS utr_number text,
  ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'bank_transfer';

-- ============================================================
-- 8. VENDOR TDS LEDGER (Section 194-O — 1% on payouts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_tds_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  vendor_pan text,
  fy_start int NOT NULL,
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  order_id text,
  settlement_id text,
  gross_payout numeric(12,2) NOT NULL,
  tds_rate numeric(5,2) NOT NULL DEFAULT 1,
  tds_amount numeric(12,2) NOT NULL,
  net_payout numeric(12,2) NOT NULL,
  challan_no text,
  deposited_at timestamptz,
  certificate_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tds_vendor_fy ON public.vendor_tds_ledger(vendor_id, fy_start, quarter);
ALTER TABLE public.vendor_tds_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vendor_tds_ledger" ON public.vendor_tds_ledger
  FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Vendors read own tds" ON public.vendor_tds_ledger
  FOR SELECT TO authenticated USING (vendor_id = get_vendor_id(auth.uid()));

-- ============================================================
-- 9. AUTO-GENERATE TAX INVOICE WHEN ORDER MOVES TO DELIVERED
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_order_invoice_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fy int;
  _inv_no text;
  _v record;
  _c record;
  _interstate boolean;
  _pf_no text;
  _pf_taxable numeric;
  _pf_cgst numeric; _pf_sgst numeric; _pf_igst numeric;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status NOT IN ('delivered','completed') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_invoices WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _fy := CASE WHEN EXTRACT(MONTH FROM now()) >= 4 THEN EXTRACT(YEAR FROM now())::int
              ELSE EXTRACT(YEAR FROM now())::int - 1 END;

  SELECT id, name, gstin, pan, shop_address, state_name, state_code
    INTO _v FROM public.vendors WHERE id = NEW.vendor_id;

  SELECT id, name, email, mobile INTO _c FROM public.customers WHERE id = NEW.customer_id;
  _interstate := COALESCE(NEW.is_interstate, false);
  _inv_no := public.next_invoice_number(NEW.vendor_id, 'invoice', _fy);

  INSERT INTO public.order_invoices (
    invoice_no, order_id, fy_start, vendor_id, vendor_name, vendor_gstin, vendor_pan,
    vendor_address, vendor_state, vendor_state_code,
    customer_id, customer_name, customer_email, customer_phone,
    place_of_supply_state, place_of_supply_code, is_interstate,
    items, taxable_value, cgst_amount, sgst_amount, igst_amount, tcs_amount,
    discount, total_amount
  ) VALUES (
    _inv_no, NEW.id, _fy, NEW.vendor_id, COALESCE(_v.name, NEW.vendor_name), _v.gstin, _v.pan,
    _v.shop_address, _v.state_name, _v.state_code,
    NEW.customer_id, COALESCE(_c.name, NEW.customer_name), _c.email, _c.mobile,
    NEW.place_of_supply_state, NEW.place_of_supply_code, _interstate,
    NEW.items, COALESCE(NEW.taxable_value, NEW.subtotal, 0),
    COALESCE(NEW.cgst_amount, 0), COALESCE(NEW.sgst_amount, 0), COALESCE(NEW.igst_amount, 0),
    COALESCE(NEW.tcs_amount, 0), COALESCE(NEW.discount, 0), COALESCE(NEW.total, 0)
  );

  UPDATE public.orders SET invoice_no = _inv_no WHERE id = NEW.id;

  -- Platform-fee invoice (only if platform_fee > 0)
  IF COALESCE(NEW.platform_fee, 0) > 0 THEN
    _pf_taxable := NEW.platform_fee;
    IF _interstate THEN
      _pf_igst := COALESCE(NEW.gst_on_platform_fee, _pf_taxable * 0.18);
      _pf_cgst := 0; _pf_sgst := 0;
    ELSE
      _pf_cgst := COALESCE(NEW.gst_on_platform_fee, _pf_taxable * 0.18) / 2;
      _pf_sgst := _pf_cgst; _pf_igst := 0;
    END IF;
    _pf_no := public.next_invoice_number('P4U', 'platform_fee', _fy);
    INSERT INTO public.platform_fee_invoices (
      invoice_no, order_id, fy_start, bill_to, recipient_id, recipient_name,
      recipient_state_code, is_interstate, taxable_value,
      cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      _pf_no, NEW.id, _fy, 'customer', NEW.customer_id, COALESCE(_c.name, NEW.customer_name),
      NEW.place_of_supply_code, _interstate, _pf_taxable,
      _pf_cgst, _pf_sgst, _pf_igst,
      _pf_taxable + _pf_cgst + _pf_sgst + _pf_igst
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_order_invoice_on_delivery failed: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_order_invoice ON public.orders;
CREATE TRIGGER trg_generate_order_invoice
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_invoice_on_delivery();

-- ============================================================
-- 10. AUTO-GENERATE CREDIT NOTE WHEN DELIVERED ORDER IS CANCELLED
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_credit_note_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fy int;
  _cn_no text;
  _inv record;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status <> 'cancelled' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  -- only if a tax invoice already exists
  SELECT * INTO _inv FROM public.order_invoices WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.credit_notes WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _fy := _inv.fy_start;
  _cn_no := public.next_invoice_number(NEW.vendor_id, 'credit_note', _fy);

  INSERT INTO public.credit_notes (
    credit_note_no, original_invoice_id, original_invoice_no, order_id, fy_start,
    vendor_id, vendor_gstin, customer_id, customer_name, reason,
    taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount,
    is_interstate, place_of_supply_code
  ) VALUES (
    _cn_no, _inv.id, _inv.invoice_no, NEW.id, _fy,
    _inv.vendor_id, _inv.vendor_gstin, _inv.customer_id, _inv.customer_name,
    COALESCE(NEW.deletion_reason, 'cancellation'),
    _inv.taxable_value, _inv.cgst_amount, _inv.sgst_amount, _inv.igst_amount,
    _inv.total_amount, _inv.is_interstate, _inv.place_of_supply_code
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_credit_note_on_cancel failed: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_credit_note ON public.orders;
CREATE TRIGGER trg_generate_credit_note
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_credit_note_on_cancel();

-- ============================================================
-- 11. updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_oi_updated ON public.order_invoices;
CREATE TRIGGER trg_oi_updated BEFORE UPDATE ON public.order_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_op_updated ON public.order_payments;
CREATE TRIGGER trg_op_updated BEFORE UPDATE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 12. AUDIT triggers on the new finance tables
-- ============================================================
DROP TRIGGER IF EXISTS audit_order_invoices ON public.order_invoices;
CREATE TRIGGER audit_order_invoices
  AFTER UPDATE OR DELETE ON public.order_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_table_change();

DROP TRIGGER IF EXISTS audit_credit_notes ON public.credit_notes;
CREATE TRIGGER audit_credit_notes
  AFTER UPDATE OR DELETE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_table_change();

DROP TRIGGER IF EXISTS audit_pf_invoices ON public.platform_fee_invoices;
CREATE TRIGGER audit_pf_invoices
  AFTER UPDATE OR DELETE ON public.platform_fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_table_change();

DROP TRIGGER IF EXISTS audit_settlements ON public.settlements;
CREATE TRIGGER audit_settlements
  AFTER UPDATE OR DELETE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.audit_critical_table_change();

-- ============================================================
-- 13. BACKFILL — generate invoices for already-delivered orders
-- ============================================================
DO $$
DECLARE r record; _fy int; _inv_no text; _v record; _c record;
BEGIN
  FOR r IN
    SELECT o.* FROM public.orders o
    WHERE o.status IN ('delivered','completed')
      AND NOT EXISTS (SELECT 1 FROM public.order_invoices oi WHERE oi.order_id = o.id)
    ORDER BY o.created_at
  LOOP
    _fy := CASE WHEN EXTRACT(MONTH FROM r.created_at) >= 4 THEN EXTRACT(YEAR FROM r.created_at)::int
                ELSE EXTRACT(YEAR FROM r.created_at)::int - 1 END;
    SELECT id, name, gstin, pan, shop_address, state_name, state_code
      INTO _v FROM public.vendors WHERE id = r.vendor_id;
    SELECT id, name, email, mobile INTO _c FROM public.customers WHERE id = r.customer_id;
    _inv_no := public.next_invoice_number(r.vendor_id, 'invoice', _fy);
    INSERT INTO public.order_invoices (
      invoice_no, order_id, fy_start, invoice_date, vendor_id, vendor_name, vendor_gstin, vendor_pan,
      vendor_address, vendor_state, vendor_state_code,
      customer_id, customer_name, customer_email, customer_phone,
      place_of_supply_state, place_of_supply_code, is_interstate,
      items, taxable_value, cgst_amount, sgst_amount, igst_amount, tcs_amount,
      discount, total_amount
    ) VALUES (
      _inv_no, r.id, _fy, r.created_at, r.vendor_id, COALESCE(_v.name, r.vendor_name), _v.gstin, _v.pan,
      _v.shop_address, _v.state_name, _v.state_code,
      r.customer_id, COALESCE(_c.name, r.customer_name), _c.email, _c.mobile,
      r.place_of_supply_state, r.place_of_supply_code, COALESCE(r.is_interstate,false),
      r.items, COALESCE(r.taxable_value, r.subtotal, 0),
      COALESCE(r.cgst_amount,0), COALESCE(r.sgst_amount,0), COALESCE(r.igst_amount,0),
      COALESCE(r.tcs_amount,0), COALESCE(r.discount,0), COALESCE(r.total,0)
    );
    UPDATE public.orders SET invoice_no = _inv_no WHERE id = r.id;
  END LOOP;
END $$;
