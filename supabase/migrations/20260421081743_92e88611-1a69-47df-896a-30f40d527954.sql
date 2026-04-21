CREATE OR REPLACE FUNCTION public.fill_order_party_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.customer_name IS NULL OR NEW.customer_name = '') AND NEW.customer_id IS NOT NULL THEN
    SELECT name INTO NEW.customer_name FROM public.customers WHERE id = NEW.customer_id;
  END IF;

  IF (NEW.vendor_name IS NULL OR NEW.vendor_name = '') AND NEW.vendor_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(business_name, ''), NULLIF(name, '')) 
      INTO NEW.vendor_name 
      FROM public.vendors 
      WHERE id = NEW.vendor_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_order_party_names ON public.orders;
CREATE TRIGGER trg_fill_order_party_names
BEFORE INSERT OR UPDATE OF customer_id, vendor_id, customer_name, vendor_name
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fill_order_party_names();