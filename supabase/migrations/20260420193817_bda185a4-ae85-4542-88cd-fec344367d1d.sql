-- Auto-assign nearest online rider when food order becomes ready / paid
CREATE OR REPLACE FUNCTION public.auto_assign_nearest_rider(_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.food_orders%ROWTYPE;
  r record;
  _max_concurrent int;
  _payout_base numeric;
  _payout_per_km numeric;
  _dist numeric;
  _payout numeric;
  _existing int;
BEGIN
  SELECT * INTO o FROM public.food_orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Order not found'); END IF;

  -- skip if already has an active assignment
  IF EXISTS (SELECT 1 FROM public.rider_assignments WHERE order_id = _order_id AND status IN ('offered','accepted')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Assignment exists');
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int, 3) INTO _max_concurrent FROM public.platform_variables WHERE key='rider_max_concurrent_orders';
  SELECT COALESCE(NULLIF(value,'')::numeric, 20) INTO _payout_base FROM public.platform_variables WHERE key='rider_payout_base';
  SELECT COALESCE(NULLIF(value,'')::numeric, 6) INTO _payout_per_km FROM public.platform_variables WHERE key='rider_payout_per_km';

  -- find online, KYC-verified, available rider closest to restaurant
  FOR r IN
    SELECT id, current_lat, current_lng,
      public.haversine_distance(o.restaurant_lat::float8, o.restaurant_lng::float8, current_lat, current_lng) AS dist
    FROM public.riders
    WHERE is_online = true
      AND status = 'active'
      AND kyc_status IN ('verified','approved')
      AND current_lat IS NOT NULL AND current_lng IS NOT NULL
    ORDER BY dist ASC NULLS LAST
    LIMIT 10
  LOOP
    SELECT COUNT(*) INTO _existing
      FROM public.rider_assignments
      WHERE rider_id = r.id AND status IN ('offered','accepted');
    IF _existing < _max_concurrent THEN
      _dist := COALESCE(r.dist, 0)
             + COALESCE(public.haversine_distance(o.restaurant_lat::float8, o.restaurant_lng::float8, o.delivery_lat::float8, o.delivery_lng::float8), 0);
      _payout := round(_payout_base + _dist * _payout_per_km, 2);
      INSERT INTO public.rider_assignments (
        order_id, rider_id, payout_amount, distance_km,
        pickup_lat, pickup_lng, pickup_address,
        drop_lat, drop_lng, drop_address,
        base_payout, distance_payout
      ) VALUES (
        _order_id, r.id, _payout, _dist,
        o.restaurant_lat, o.restaurant_lng, o.restaurant_address,
        o.delivery_lat, o.delivery_lng, o.delivery_address,
        _payout_base, round(_dist * _payout_per_km, 2)
      );
      RETURN jsonb_build_object('ok', true, 'rider_id', r.id, 'distance_km', _dist, 'payout', _payout);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', false, 'reason', 'No available rider');
END;
$$;

-- Trigger: when food_order becomes 'ready' (cooked, awaiting pickup), auto-assign
CREATE OR REPLACE FUNCTION public.trg_food_order_auto_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'ready' AND COALESCE(OLD.status,'') <> 'ready' THEN
    PERFORM public.auto_assign_nearest_rider(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_food_order_auto_assign failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS food_order_auto_assign ON public.food_orders;
CREATE TRIGGER food_order_auto_assign
  AFTER UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_food_order_auto_assign();

-- Allow riders to view their own assignments and update them
DROP POLICY IF EXISTS "Riders view own assignments" ON public.rider_assignments;
CREATE POLICY "Riders view own assignments" ON public.rider_assignments
  FOR SELECT TO authenticated
  USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Riders update own assignments" ON public.rider_assignments;
CREATE POLICY "Riders update own assignments" ON public.rider_assignments
  FOR UPDATE TO authenticated
  USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()))
  WITH CHECK (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));

-- Allow riders to view own payouts
DROP POLICY IF EXISTS "Riders view own payouts" ON public.rider_payouts;
CREATE POLICY "Riders view own payouts" ON public.rider_payouts
  FOR SELECT TO authenticated
  USING (rider_id = public.get_rider_id(auth.uid()) OR public.is_admin_user(auth.uid()));

-- Allow riders to update their own profile (KYC / bank / vehicle / location)
DROP POLICY IF EXISTS "Riders update own profile" ON public.riders;
CREATE POLICY "Riders update own profile" ON public.riders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Riders view own profile" ON public.riders;
CREATE POLICY "Riders view own profile" ON public.riders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));