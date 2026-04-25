DO $$
DECLARE
  tbl regclass;
  col text;
BEGIN
  FOR tbl, col IN
    SELECT c.table_name::regclass, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying')
  LOOP
    EXECUTE format(
      'UPDATE %s SET %I = replace(%I, %L, %L) WHERE %I LIKE %L',
      tbl,
      col,
      col,
      'https://cdn.planext4u.net/',
      'https://f005.backblazeb2.com/file/planext4u/',
      col,
      'https://cdn.planext4u.net/%'
    );
  END LOOP;
END $$;

DO $$
DECLARE
  tbl regclass;
  col text;
BEGIN
  FOR tbl, col IN
    SELECT c.table_name::regclass, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'ARRAY'
      AND c.udt_name = '_text'
  LOOP
    EXECUTE format(
      'UPDATE %s SET %I = (SELECT array_agg(replace(x, %L, %L)) FROM unnest(%I) AS x) WHERE EXISTS (SELECT 1 FROM unnest(%I) AS y WHERE y LIKE %L)',
      tbl,
      col,
      'https://cdn.planext4u.net/',
      'https://f005.backblazeb2.com/file/planext4u/',
      col,
      col,
      'https://cdn.planext4u.net/%'
    );
  END LOOP;
END $$;

DO $$
DECLARE
  tbl regclass;
  col text;
BEGIN
  FOR tbl, col IN
    SELECT c.table_name::regclass, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'jsonb'
  LOOP
    EXECUTE format(
      'UPDATE %s SET %I = replace(%I::text, %L, %L)::jsonb WHERE %I::text LIKE %L',
      tbl,
      col,
      col,
      'https://cdn.planext4u.net/',
      'https://f005.backblazeb2.com/file/planext4u/',
      col,
      '%https://cdn.planext4u.net/%'
    );
  END LOOP;
END $$;