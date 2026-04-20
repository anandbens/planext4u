
-- 1. Extend rider_assignments
ALTER TABLE public.rider_assignments
  ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS drop_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS drop_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS drop_address TEXT,
  ADD COLUMN IF NOT EXISTS sequence_no INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_payout NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rider_assignments_batch ON public.rider_assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_rider_assignments_rider_status ON public.rider_assignments(rider_id, status);

-- 2. rider_settlements
CREATE TABLE IF NOT EXISTS public.rider_settlements (
  id TEXT PRIMARY KEY,
  rider_id TEXT NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  rider_name TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_count INT NOT NULL DEFAULT 0,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_settlements_rider ON public.rider_settlements(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_settlements_status ON public.rider_settlements(status);

ALTER TABLE public.rider_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders can view own settlements" ON public.rider_settlements;
CREATE POLICY "Riders can view own settlements"
ON public.rider_settlements FOR SELECT
USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage rider settlements" ON public.rider_settlements;
CREATE POLICY "Admins manage rider settlements"
ON public.rider_settlements FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 3. rider_payouts
CREATE TABLE IF NOT EXISTS public.rider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id TEXT NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.rider_assignments(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  distance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  settlement_id TEXT REFERENCES public.rider_settlements(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_rider_payouts_assignment ON public.rider_payouts(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rider_payouts_rider_status ON public.rider_payouts(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_rider_payouts_settlement ON public.rider_payouts(settlement_id);

ALTER TABLE public.rider_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders view own payouts" ON public.rider_payouts;
CREATE POLICY "Riders view own payouts"
ON public.rider_payouts FOR SELECT
USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage rider payouts" ON public.rider_payouts;
CREATE POLICY "Admins manage rider payouts"
ON public.rider_payouts FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 4. Trigger: auto create payout when assignment delivered
CREATE OR REPLACE FUNCTION public.create_rider_payout_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base NUMERIC(10,2);
  _dist NUMERIC(10,2);
  _tip NUMERIC(10,2);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'delivered' AND COALESCE(OLD.status,'') <> 'delivered' THEN
    IF EXISTS (SELECT 1 FROM public.rider_payouts WHERE assignment_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    _base := COALESCE(NEW.base_payout, 0);
    _dist := COALESCE(NEW.distance_payout, 0);
    _tip := COALESCE(NEW.tip_amount, 0);
    IF _base = 0 AND _dist = 0 AND COALESCE(NEW.payout_amount,0) > 0 THEN
      _base := 20;
      _dist := GREATEST(0, COALESCE(NEW.payout_amount,0) - 20 - _tip);
    END IF;
    INSERT INTO public.rider_payouts (rider_id, assignment_id, order_id, base_amount, distance_amount, tip_amount, total_amount, distance_km, status, earned_at)
    VALUES (NEW.rider_id, NEW.id, NEW.order_id, _base, _dist, _tip, _base + _dist + _tip, COALESCE(NEW.distance_km, 0), 'pending', COALESCE(NEW.delivered_at, now()));

    UPDATE public.riders
       SET total_deliveries = COALESCE(total_deliveries,0) + 1,
           total_earnings = COALESCE(total_earnings,0) + (_base + _dist + _tip),
           updated_at = now()
     WHERE id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_rider_payout_on_delivery ON public.rider_assignments;
CREATE TRIGGER trg_create_rider_payout_on_delivery
AFTER UPDATE ON public.rider_assignments
FOR EACH ROW EXECUTE FUNCTION public.create_rider_payout_on_delivery();

-- 5. Trigger: when settlement marked completed → mark its payouts settled
CREATE OR REPLACE FUNCTION public.complete_rider_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed' THEN
    UPDATE public.rider_payouts
       SET status = 'settled', settled_at = now()
     WHERE settlement_id = NEW.id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_rider_settlement ON public.rider_settlements;
CREATE TRIGGER trg_complete_rider_settlement
BEFORE UPDATE ON public.rider_settlements
FOR EACH ROW EXECUTE FUNCTION public.complete_rider_settlement();

-- 6. Helper function: pending balance for a rider
CREATE OR REPLACE FUNCTION public.rider_pending_balance(_rider_id TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_amount), 0)
  FROM public.rider_payouts
  WHERE rider_id = _rider_id AND status = 'pending'
$$;

-- 7. Function to settle a rider's pending payouts in one batch
CREATE OR REPLACE FUNCTION public.create_rider_settlement(
  _rider_id TEXT,
  _method TEXT DEFAULT 'bank_transfer',
  _reference TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stl_id TEXT;
  _amount NUMERIC := 0;
  _count INT := 0;
  _rider_name TEXT;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create settlements';
  END IF;

  SELECT name INTO _rider_name FROM public.riders WHERE id = _rider_id;

  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
    INTO _amount, _count
    FROM public.rider_payouts
   WHERE rider_id = _rider_id AND status = 'pending';

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No pending payouts');
  END IF;

  _stl_id := 'RST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.rider_settlements (id, rider_id, rider_name, amount, method, reference, notes, status, payout_count, initiated_by, completed_at)
  VALUES (_stl_id, _rider_id, _rider_name, _amount, _method, _reference, _notes, 'completed', _count, auth.uid(), now());

  UPDATE public.rider_payouts
     SET settlement_id = _stl_id, status = 'settled', settled_at = now()
   WHERE rider_id = _rider_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'settlement_id', _stl_id, 'amount', _amount, 'payout_count', _count);
END;
$$;

-- 8. Platform variables (insert defaults if missing)
INSERT INTO public.platform_variables (id, key, value, description)
VALUES
  ('rider_max_concurrent_orders', 'rider_max_concurrent_orders', '3', 'Max stacked orders per rider'),
  ('rider_payout_base', 'rider_payout_base', '20', 'Rider base payout per order (₹)'),
  ('rider_payout_per_km', 'rider_payout_per_km', '6', 'Rider payout per km (₹)')
ON CONFLICT (key) DO NOTHING;
