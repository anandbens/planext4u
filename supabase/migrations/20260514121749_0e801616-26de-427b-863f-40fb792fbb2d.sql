-- Auto-assign Basic plan to new vendors and backfill existing
CREATE OR REPLACE FUNCTION public.assign_default_basic_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _basic_id uuid;
BEGIN
  IF NEW.plan_id IS NULL THEN
    SELECT id INTO _basic_id
      FROM public.vendor_plans
      WHERE lower(plan_name) = 'basic' AND is_active = true
      ORDER BY plan_tier ASC
      LIMIT 1;
    IF _basic_id IS NOT NULL THEN
      NEW.plan_id := _basic_id;
      IF NEW.plan_start_date IS NULL THEN NEW.plan_start_date := now(); END IF;
      IF NEW.plan_end_date IS NULL THEN NEW.plan_end_date := now() + interval '3650 days'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendors_assign_basic_plan ON public.vendors;
CREATE TRIGGER trg_vendors_assign_basic_plan
  BEFORE INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_basic_plan();

DROP TRIGGER IF EXISTS trg_service_vendors_assign_basic_plan ON public.service_vendors;
CREATE TRIGGER trg_service_vendors_assign_basic_plan
  BEFORE INSERT ON public.service_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_basic_plan();

-- Backfill existing vendors with no plan
UPDATE public.vendors
   SET plan_id = (SELECT id FROM public.vendor_plans WHERE lower(plan_name) = 'basic' AND is_active = true ORDER BY plan_tier ASC LIMIT 1),
       plan_start_date = COALESCE(plan_start_date, now()),
       plan_end_date   = COALESCE(plan_end_date, now() + interval '3650 days')
 WHERE plan_id IS NULL;

UPDATE public.service_vendors
   SET plan_id = (SELECT id FROM public.vendor_plans WHERE lower(plan_name) = 'basic' AND is_active = true ORDER BY plan_tier ASC LIMIT 1)
 WHERE plan_id IS NULL;