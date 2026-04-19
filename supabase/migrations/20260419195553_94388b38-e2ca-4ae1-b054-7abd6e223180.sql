-- 1) Services: add SAC + GST + commission override
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS sac_code text,
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS commission_override numeric,
  ADD COLUMN IF NOT EXISTS max_redemption_percentage numeric;

-- 2) service_bookings: full financial columns + booking metadata
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS service_title text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS sac_code text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS cgst_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_interstate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS place_of_supply_state text,
  ADD COLUMN IF NOT EXISTS place_of_supply_code text,
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_on_platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_vendor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS settlement_id text;

-- 3) Prevent slot double-booking on same vendor + date + start_time (only for active bookings)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking_slot
  ON public.service_bookings(vendor_id, booking_date, start_time)
  WHERE status NOT IN ('cancelled','rejected');

-- 4) RLS - allow customers to insert/view their own bookings, vendors to view/update their own
DROP POLICY IF EXISTS "Customers can insert own bookings" ON public.service_bookings;
CREATE POLICY "Customers can insert own bookings" ON public.service_bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Vendors can view own bookings" ON public.service_bookings;
CREATE POLICY "Vendors can view own bookings" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()));

DROP POLICY IF EXISTS "Vendors can update own bookings" ON public.service_bookings;
CREATE POLICY "Vendors can update own bookings" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (vendor_id = public.get_vendor_id(auth.uid()))
  WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));

DROP POLICY IF EXISTS "Customers can update own bookings" ON public.service_bookings;
CREATE POLICY "Customers can update own bookings" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

-- 5) Auto-generate 6-digit OTP at booking creation if missing
CREATE OR REPLACE FUNCTION public.set_booking_otp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.otp_code IS NULL OR NEW.otp_code = '' THEN
    NEW.otp_code := lpad(floor(random() * 1000000)::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_otp ON public.service_bookings;
CREATE TRIGGER trg_booking_otp BEFORE INSERT ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_otp();

-- 6) Auto-create settlement when service booking is completed
CREATE OR REPLACE FUNCTION public.create_settlement_on_booking_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _stl_id text;
  _v_name text;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status <> 'completed' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.settlement_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _stl_id := 'STL-SVC-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  SELECT business_name INTO _v_name FROM public.vendors WHERE id = NEW.vendor_id;
  IF _v_name IS NULL THEN
    SELECT business_name INTO _v_name FROM public.service_vendors WHERE id = NEW.vendor_id;
  END IF;

  INSERT INTO public.settlements (
    id, vendor_id, vendor_name, order_id, amount, commission, net_amount,
    gross_sales, taxable_value, cgst_collected, sgst_collected, igst_collected,
    gst_on_commission, payable_to_vendor, status, created_at
  ) VALUES (
    _stl_id, NEW.vendor_id, COALESCE(_v_name, NEW.vendor_id), NEW.id::text,
    NEW.total_amount, NEW.commission_amount, NEW.net_to_vendor,
    NEW.subtotal, NEW.taxable_value, NEW.cgst_amount, NEW.sgst_amount, NEW.igst_amount,
    round(NEW.commission_amount * 0.18, 2), NEW.net_to_vendor, 'pending', now()
  );

  UPDATE public.service_bookings SET settlement_id = _stl_id WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_settlement_on_booking_completion failed: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_settlement ON public.service_bookings;
CREATE TRIGGER trg_booking_settlement AFTER UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_settlement_on_booking_completion();