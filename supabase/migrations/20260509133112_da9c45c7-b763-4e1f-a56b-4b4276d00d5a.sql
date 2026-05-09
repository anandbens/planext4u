ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_address text;

CREATE INDEX IF NOT EXISTS idx_services_latitude ON public.services (latitude);
CREATE INDEX IF NOT EXISTS idx_services_longitude ON public.services (longitude);
CREATE INDEX IF NOT EXISTS idx_services_vendor_location ON public.services (vendor_id, latitude, longitude);

CREATE OR REPLACE FUNCTION public.sync_vendor_service_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_vendors
  SET
    shop_address = NEW.shop_address,
    shop_latitude = NEW.shop_latitude,
    shop_longitude = NEW.shop_longitude
  WHERE id = NEW.id;

  UPDATE public.services
  SET
    latitude = COALESCE(latitude, NEW.shop_latitude),
    longitude = COALESCE(longitude, NEW.shop_longitude),
    location_address = COALESCE(location_address, NEW.shop_address)
  WHERE vendor_id = NEW.id
    AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vendor_service_location ON public.vendors;
CREATE TRIGGER trg_sync_vendor_service_location
AFTER INSERT OR UPDATE OF shop_address, shop_latitude, shop_longitude ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.sync_vendor_service_location();