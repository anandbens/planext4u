DO $$
DECLARE
  r RECORD;
  legacy_bases TEXT[] := ARRAY[
    'https://f005.backblazeb2.com/file/planext4u/',
    'https://cdn.planext4u.com/',
    'https://www.planext4u.net/media-library/',
    'https://planext4u.net/media-library/'
  ];
  base TEXT;
  sql_text TEXT;
BEGIN
  -- 1) Text/varchar columns across all public tables
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'character')
  LOOP
    FOREACH base IN ARRAY legacy_bases LOOP
      sql_text := format(
        'UPDATE %I.%I SET %I = REPLACE(%I, %L, %L) WHERE %I LIKE %L',
        r.table_schema, r.table_name, r.column_name, r.column_name,
        base, 'https://cdn.planext4u.net/',
        r.column_name, base || '%'
      );
      BEGIN
        EXECUTE sql_text;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped %.%.% : %', r.table_schema, r.table_name, r.column_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  -- 2) JSONB columns: cast → text → replace → cast back
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'jsonb'
  LOOP
    FOREACH base IN ARRAY legacy_bases LOOP
      sql_text := format(
        'UPDATE %I.%I SET %I = REPLACE(%I::text, %L, %L)::jsonb WHERE %I::text LIKE %L',
        r.table_schema, r.table_name, r.column_name, r.column_name,
        base, 'https://cdn.planext4u.net/',
        r.column_name, '%' || base || '%'
      );
      BEGIN
        EXECUTE sql_text;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped jsonb %.%.% : %', r.table_schema, r.table_name, r.column_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;