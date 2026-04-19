-- Auto-create tax invoice on service booking completion
CREATE OR REPLACE FUNCTION public.create_invoice_on_booking_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inv_no text;
  _fy int;
  _vendor record;
  _seq int;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status <> 'completed' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip if invoice already exists for this booking
  IF EXISTS (SELECT 1 FROM public.order_invoices WHERE order_id = NEW.id::text) THEN
    RETURN NEW;
  END IF;

  _fy := CASE WHEN extract(month from now()) >= 4 THEN extract(year from now())::int ELSE extract(year from now())::int - 1 END;
  SELECT count(*) + 1 INTO _seq FROM public.order_invoices WHERE fy_start = _fy;
  _inv_no := 'INV-SVC-' || _fy || '-' || lpad(_seq::text, 6, '0');

  SELECT business_name, gstin, pan, address, state_name, state_code
    INTO _vendor FROM public.vendors WHERE id = NEW.vendor_id;
  IF _vendor.business_name IS NULL THEN
    SELECT business_name, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
      INTO _vendor FROM public.service_vendors WHERE id = NEW.vendor_id;
  END IF;

  INSERT INTO public.order_invoices (
    invoice_no, order_id, fy_start, invoice_date,
    vendor_id, vendor_name, vendor_gstin, vendor_pan, vendor_address, vendor_state, vendor_state_code,
    customer_id, customer_name, customer_phone, customer_address,
    place_of_supply_state, place_of_supply_code, is_interstate,
    items, taxable_value, cgst_amount, sgst_amount, igst_amount,
    discount, total_amount, notes
  ) VALUES (
    _inv_no, NEW.id::text, _fy, now(),
    NEW.vendor_id, COALESCE(_vendor.business_name, NEW.vendor_id),
    _vendor.gstin, _vendor.pan, _vendor.address, _vendor.state_name, _vendor.state_code,
    NEW.customer_id, NEW.customer_name, NEW.customer_phone, NEW.customer_address,
    NEW.place_of_supply_state, NEW.place_of_supply_code, NEW.is_interstate,
    jsonb_build_array(jsonb_build_object(
      'title', COALESCE(NEW.service_title, 'Service'),
      'sac_code', NEW.sac_code,
      'qty', 1,
      'price', NEW.subtotal,
      'gst_rate', NEW.gst_rate,
      'taxable_value', NEW.taxable_value
    )),
    NEW.taxable_value, NEW.cgst_amount, NEW.sgst_amount, NEW.igst_amount,
    NEW.discount, NEW.total_amount,
    'Auto-generated tax invoice for service booking ' || NEW.id::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_invoice_on_booking_completion failed: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_invoice ON public.service_bookings;
CREATE TRIGGER trg_booking_invoice AFTER UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_invoice_on_booking_completion();