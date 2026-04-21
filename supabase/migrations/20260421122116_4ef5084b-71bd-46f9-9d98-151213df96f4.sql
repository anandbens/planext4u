-- 1. Add scheduling fields to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_duration_minutes integer NOT NULL DEFAULT 60 CHECK (service_duration_minutes >= 15);

-- 2. Add working hours + buffer to vendor_availability (slots auto-generated)
ALTER TABLE public.vendor_availability
  ADD COLUMN IF NOT EXISTS start_time time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS end_time time NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 30 CHECK (buffer_minutes >= 15);

-- 3. Date-specific overrides (today off / holiday / custom hours for one date)
CREATE TABLE IF NOT EXISTS public.vendor_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  override_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  buffer_minutes integer,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, override_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_date_overrides_lookup
  ON public.vendor_date_overrides (vendor_id, override_date);

ALTER TABLE public.vendor_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vendor date overrides"
  ON public.vendor_date_overrides FOR SELECT USING (true);

CREATE POLICY "Vendors manage own date overrides INS"
  ON public.vendor_date_overrides FOR INSERT
  WITH CHECK (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Vendors manage own date overrides UPD"
  ON public.vendor_date_overrides FOR UPDATE
  USING (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Vendors manage own date overrides DEL"
  ON public.vendor_date_overrides FOR DELETE
  USING (vendor_id = get_vendor_id(auth.uid()));

CREATE POLICY "Admins manage all vendor date overrides"
  ON public.vendor_date_overrides FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_vendor_date_overrides_updated_at
  BEFORE UPDATE ON public.vendor_date_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Guard: prevent marking date as unavailable if active bookings exist
CREATE OR REPLACE FUNCTION public.guard_vendor_date_override()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing int;
BEGIN
  IF NEW.is_available = false THEN
    SELECT COUNT(*) INTO _existing
    FROM public.service_bookings
    WHERE vendor_id = NEW.vendor_id
      AND booking_date = NEW.override_date
      AND status NOT IN ('cancelled', 'rejected', 'completed');
    IF _existing > 0 THEN
      RAISE EXCEPTION 'Cannot mark date as unavailable: % active booking(s) exist on %. Reschedule or cancel them first.', _existing, NEW.override_date;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_vendor_date_override ON public.vendor_date_overrides;
CREATE TRIGGER trg_guard_vendor_date_override
  BEFORE INSERT OR UPDATE ON public.vendor_date_overrides
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_date_override();

-- 5. Booking window + slot-window guard on service_bookings
CREATE OR REPLACE FUNCTION public.guard_service_booking_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _window_days int;
  _override record;
  _avail record;
  _conflicts int;
  _duration int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- a) Booking window
    SELECT COALESCE(NULLIF(value,'')::int, 7) INTO _window_days
      FROM public.platform_variables WHERE key = 'service_booking_window_days';
    IF _window_days IS NULL THEN _window_days := 7; END IF;
    IF NEW.booking_date > (CURRENT_DATE + _window_days) THEN
      RAISE EXCEPTION 'Bookings allowed only within next % days', _window_days;
    END IF;
    IF NEW.booking_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot book a past date';
    END IF;

    -- b) Date override check
    SELECT * INTO _override FROM public.vendor_date_overrides
      WHERE vendor_id = NEW.vendor_id AND override_date = NEW.booking_date;
    IF FOUND AND _override.is_available = false THEN
      RAISE EXCEPTION 'Vendor is unavailable on %', NEW.booking_date;
    END IF;

    -- c) Weekly availability check (only when no override)
    IF NOT FOUND THEN
      SELECT * INTO _avail FROM public.vendor_availability
        WHERE vendor_id = NEW.vendor_id AND day_of_week = EXTRACT(DOW FROM NEW.booking_date)::int;
      IF NOT FOUND OR _avail.is_available = false THEN
        RAISE EXCEPTION 'Vendor is not available on this day of the week';
      END IF;
    END IF;

    -- d) Overlap check (range overlap, not just same start)
    SELECT COUNT(*) INTO _conflicts FROM public.service_bookings
      WHERE vendor_id = NEW.vendor_id
        AND booking_date = NEW.booking_date
        AND status NOT IN ('cancelled', 'rejected')
        AND (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time);
    IF _conflicts > 0 THEN
      RAISE EXCEPTION 'Slot conflicts with an existing booking';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_service_booking_window ON public.service_bookings;
CREATE TRIGGER trg_guard_service_booking_window
  BEFORE INSERT ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_service_booking_window();

-- 6. Slot generator RPC: returns bookable slots for a service on a date
CREATE OR REPLACE FUNCTION public.generate_service_slots(_service_id text, _date date)
RETURNS TABLE(start_time time, end_time time, is_booked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _vendor_id text;
  _duration int;
  _override record;
  _avail record;
  _start time;
  _end time;
  _buffer int;
  _cursor time;
  _slot_end time;
  _window_days int;
BEGIN
  SELECT vendor_id, COALESCE(service_duration_minutes, 60)
    INTO _vendor_id, _duration
    FROM public.services WHERE id = _service_id;
  IF _vendor_id IS NULL THEN RETURN; END IF;

  -- Booking window guard
  SELECT COALESCE(NULLIF(value,'')::int, 7) INTO _window_days
    FROM public.platform_variables WHERE key = 'service_booking_window_days';
  IF _window_days IS NULL THEN _window_days := 7; END IF;
  IF _date < CURRENT_DATE OR _date > (CURRENT_DATE + _window_days) THEN
    RETURN;
  END IF;

  -- Date override wins
  SELECT * INTO _override FROM public.vendor_date_overrides
    WHERE vendor_id = _vendor_id AND override_date = _date;
  IF FOUND THEN
    IF _override.is_available = false THEN RETURN; END IF;
    _start := COALESCE(_override.start_time, '09:00'::time);
    _end := COALESCE(_override.end_time, '18:00'::time);
    _buffer := COALESCE(_override.buffer_minutes, 30);
  ELSE
    SELECT * INTO _avail FROM public.vendor_availability
      WHERE vendor_id = _vendor_id AND day_of_week = EXTRACT(DOW FROM _date)::int;
    IF NOT FOUND OR _avail.is_available = false THEN RETURN; END IF;
    _start := _avail.start_time;
    _end := _avail.end_time;
    _buffer := _avail.buffer_minutes;
  END IF;

  _cursor := _start;
  WHILE _cursor + (_duration || ' minutes')::interval <= _end LOOP
    _slot_end := _cursor + (_duration || ' minutes')::interval;
    RETURN QUERY SELECT
      _cursor,
      _slot_end,
      EXISTS (
        SELECT 1 FROM public.service_bookings sb
        WHERE sb.vendor_id = _vendor_id
          AND sb.booking_date = _date
          AND sb.status NOT IN ('cancelled', 'rejected')
          AND (sb.start_time, sb.end_time) OVERLAPS (_cursor, _slot_end)
      );
    _cursor := _slot_end + (_buffer || ' minutes')::interval;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_service_slots(text, date) TO anon, authenticated;

-- 7. Seed booking window setting
INSERT INTO public.platform_variables (id, key, value, description)
VALUES ('pv-svc-window', 'service_booking_window_days', '7', 'Max days ahead customers can book a service')
ON CONFLICT (key) DO NOTHING;