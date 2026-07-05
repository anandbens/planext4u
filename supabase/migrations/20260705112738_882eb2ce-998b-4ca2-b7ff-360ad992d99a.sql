GRANT SELECT ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

GRANT SELECT ON public.service_vendors TO authenticated;
GRANT ALL ON public.service_vendors TO service_role;