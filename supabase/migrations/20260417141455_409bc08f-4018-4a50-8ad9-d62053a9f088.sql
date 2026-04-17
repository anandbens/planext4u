-- ─── Phase 6: Food Payments Polish ─────────────────────────────────

-- 1. Payment transactions ledger (one row per payment attempt / refund)
CREATE TABLE IF NOT EXISTS public.food_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  txn_type TEXT NOT NULL DEFAULT 'payment', -- payment | refund | adjustment
  payment_method TEXT NOT NULL,             -- upi | card | netbanking | wallet | emi | cod | points
  payment_provider TEXT NOT NULL DEFAULT 'razorpay', -- razorpay | wallet | cod | manual
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | success | failed | refunded
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_refund_id TEXT,
  razorpay_signature TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_payments_order ON public.food_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_food_payments_customer ON public.food_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_payments_status ON public.food_payments(status);

ALTER TABLE public.food_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own food payments"
  ON public.food_payments FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Customer inserts own food payments"
  ON public.food_payments FOR INSERT
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

CREATE POLICY "Admin updates food payments"
  ON public.food_payments FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Service role full access on food payments"
  ON public.food_payments FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER trg_food_payments_updated
  BEFORE UPDATE ON public.food_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Refunds tracker
CREATE TABLE IF NOT EXISTS public.food_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT 'order_cancelled',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | processing | completed | failed
  refund_method TEXT NOT NULL DEFAULT 'original', -- original | wallet | manual
  razorpay_refund_id TEXT,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_food_refunds_order ON public.food_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_food_refunds_customer ON public.food_refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_refunds_status ON public.food_refunds(status);

ALTER TABLE public.food_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own food refunds"
  ON public.food_refunds FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admin manages food refunds"
  ON public.food_refunds FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Service role full access on food refunds"
  ON public.food_refunds FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.food_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE REFERENCES public.food_orders(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  packaging_fee NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_id TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_food_invoices_customer ON public.food_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_invoices_restaurant ON public.food_invoices(restaurant_id);

ALTER TABLE public.food_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own food invoices"
  ON public.food_invoices FOR SELECT
  USING (customer_id = public.get_customer_id(auth.uid()) OR public.is_admin_user(auth.uid()));

CREATE POLICY "Service role manages food invoices"
  ON public.food_invoices FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Allowed payment methods on food_orders
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_no TEXT;

-- 5. Auto-generate invoice number + record on delivered
CREATE OR REPLACE FUNCTION public.generate_food_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seq BIGINT;
  _invoice_no TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('delivered','completed')
     AND NOT EXISTS (SELECT 1 FROM public.food_invoices WHERE order_id = NEW.id) THEN
    _seq := (EXTRACT(EPOCH FROM now())::BIGINT % 100000000);
    _invoice_no := 'INV-FD-' || to_char(now(), 'YYYYMM') || '-' || lpad(_seq::text, 8, '0');

    INSERT INTO public.food_invoices (
      invoice_no, order_id, customer_id, restaurant_id,
      subtotal, tax, delivery_fee, packaging_fee, platform_fee, discount, total,
      payment_method, payment_id
    ) VALUES (
      _invoice_no, NEW.id, NEW.customer_id, NEW.restaurant_id,
      NEW.subtotal, NEW.gst, NEW.delivery_fee, NEW.packaging_fee, NEW.platform_fee,
      COALESCE(NEW.discount,0) + COALESCE(NEW.wallet_amount_used,0),
      NEW.total, NEW.payment_method, NEW.razorpay_payment_id
    );

    UPDATE public.food_orders SET invoice_no = _invoice_no WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_food_invoice ON public.food_orders;
CREATE TRIGGER trg_generate_food_invoice
  AFTER UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_food_invoice();

-- 6. Refund initiation RPC (called from admin or auto on cancel after payment)
CREATE OR REPLACE FUNCTION public.initiate_food_refund(
  _order_id TEXT,
  _amount NUMERIC,
  _reason TEXT DEFAULT 'order_cancelled',
  _refund_method TEXT DEFAULT 'original'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.food_orders%ROWTYPE;
  _refund_id UUID;
BEGIN
  SELECT * INTO o FROM public.food_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Order not found'); END IF;

  IF o.payment_status NOT IN ('paid','refunded') THEN
    -- For COD or unpaid orders, mark as no-refund-needed
    UPDATE public.food_orders SET refund_status = 'not_applicable' WHERE id = _order_id;
    RETURN jsonb_build_object('ok', true, 'note', 'No payment captured, refund not required');
  END IF;

  IF _amount <= 0 OR _amount > o.total THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Invalid refund amount');
  END IF;

  INSERT INTO public.food_refunds (order_id, customer_id, amount, reason, refund_method, initiated_by, status)
  VALUES (_order_id, o.customer_id, _amount, _reason, _refund_method, auth.uid(), 'pending')
  RETURNING id INTO _refund_id;

  UPDATE public.food_orders
    SET refund_status = 'pending',
        refund_amount = COALESCE(refund_amount, 0) + _amount
    WHERE id = _order_id;

  -- If refund_method = wallet, instantly credit customer wallet
  IF _refund_method = 'wallet' THEN
    UPDATE public.customers SET wallet_points = COALESCE(wallet_points,0) + _amount::int
      WHERE id = o.customer_id;
    UPDATE public.food_refunds SET status = 'completed', completed_at = now() WHERE id = _refund_id;
    UPDATE public.food_orders SET refund_status = 'completed', payment_status = 'refunded' WHERE id = _order_id;

    INSERT INTO public.points_transactions (id, user_id, type, points, description, is_expired, cooling_status)
    VALUES ('PT-REF-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
            o.customer_id, 'refund', _amount::int,
            'Refund credited to wallet for order ' || _order_id,
            false, 'credited');
  END IF;

  RETURN jsonb_build_object('ok', true, 'refund_id', _refund_id);
END;
$$;