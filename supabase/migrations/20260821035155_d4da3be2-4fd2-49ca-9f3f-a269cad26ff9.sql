UPDATE public.advertisements
SET end_date = to_char((CURRENT_DATE + INTERVAL '1 year')::date, 'YYYY-MM-DD')
WHERE status = 'active' AND end_date::date < CURRENT_DATE;

INSERT INTO public.platform_variables (id, key, value, description)
SELECT v.key, v.key, v.value, v.description
FROM (VALUES
  ('adsense_enabled', 'false', 'Enable Google AdSense units across Socio feed and ecommerce pages'),
  ('adsense_client_id', '', 'Google AdSense publisher ID, e.g. ca-pub-0000000000000000'),
  ('adsense_slot_socio', '', 'AdSense ad slot ID used inside the Socio feed'),
  ('adsense_slot_ecommerce', '', 'AdSense ad slot ID used on ecommerce pages (home, browse, product)')
) AS v(key, value, description)
WHERE NOT EXISTS (SELECT 1 FROM public.platform_variables p WHERE p.key = v.key);