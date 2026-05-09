CREATE OR REPLACE FUNCTION public.generate_service_slots(_service_id text, _date date)
 RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_booked boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _slots jsonb;
  _slot jsonb;
  _s_start time;
  _s_end time;
BEGIN
  SELECT vendor_id, COALESCE(service_duration_minutes, 60)
    INTO _vendor_id, _duration
    FROM public.services WHERE id = _service_id;
  IF _vendor_id IS NULL THEN RETURN; END IF;

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
    _slots := '[]'::jsonb;
  ELSE
    SELECT * INTO _avail FROM public.vendor_availability
      WHERE vendor_id = _vendor_id AND day_of_week = EXTRACT(DOW FROM _date)::int;
    IF NOT FOUND OR _avail.is_available = false THEN RETURN; END IF;
    _start := _avail.start_time;
    _end := _avail.end_time;
    _buffer := _avail.buffer_minutes;
    _slots := COALESCE(_avail.time_slots, '[]'::jsonb);
  END IF;

  -- If vendor defined explicit slots, use them
  IF jsonb_typeof(_slots) = 'array' AND jsonb_array_length(_slots) > 0 THEN
    FOR _slot IN SELECT * FROM jsonb_array_elements(_slots) LOOP
      BEGIN
        _s_start := (_slot->>'start')::time;
        _s_end := (_slot->>'end')::time;
      EXCEPTION WHEN OTHERS THEN CONTINUE; END;
      IF _s_start IS NULL OR _s_end IS NULL OR _s_end <= _s_start THEN CONTINUE; END IF;
      RETURN QUERY SELECT
        _s_start,
        _s_end,
        EXISTS (
          SELECT 1 FROM public.service_bookings sb
          WHERE sb.vendor_id = _vendor_id
            AND sb.booking_date = _date
            AND sb.status NOT IN ('cancelled','rejected')
            AND (sb.start_time, sb.end_time) OVERLAPS (_s_start, _s_end)
        );
    END LOOP;
    RETURN;
  END IF;

  -- Otherwise auto-generate from working hours + service duration + buffer
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
          AND sb.status NOT IN ('cancelled','rejected')
          AND (sb.start_time, sb.end_time) OVERLAPS (_cursor, _slot_end)
      );
    _cursor := _slot_end + (_buffer || ' minutes')::interval;
  END LOOP;
END $function$;