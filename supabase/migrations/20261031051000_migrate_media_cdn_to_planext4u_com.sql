-- The planext4u.net DNS zone is no longer active. Rewrite every stored media
-- reference to the working Cloudflare/Backblaze CDN hostname.
--
-- This deliberately scans text and JSON columns so URLs embedded in arrays
-- (product images, social post media, order snapshots, etc.) are repaired too.
DO $$
DECLARE
  col record;
  old_base constant text := 'https://cdn.planext4u.net/';
  new_base constant text := 'https://cdn.planext4u.com/';
BEGIN
  FOR col IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
  LOOP
    IF col.data_type = 'jsonb' THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I::text, $1, $2)::jsonb WHERE %I::text LIKE $3',
        col.table_name, col.column_name, col.column_name, col.column_name
      ) USING old_base, new_base, '%' || old_base || '%';
    ELSIF col.data_type = 'json' THEN
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I::text, $1, $2)::json WHERE %I::text LIKE $3',
        col.table_name, col.column_name, col.column_name, col.column_name
      ) USING old_base, new_base, '%' || old_base || '%';
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I, $1, $2) WHERE %I LIKE $3',
        col.table_name, col.column_name, col.column_name, col.column_name
      ) USING old_base, new_base, '%' || old_base || '%';
    END IF;
  END LOOP;
END $$;
