
DELETE FROM public.districts a
USING public.districts b
WHERE a.id::text > b.id::text
  AND a.name = b.name
  AND a.state_id = b.state_id;
