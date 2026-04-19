-- 1. Storage bucket for original CSV files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('file-uploads', 'file-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can read/write the file-uploads bucket
DROP POLICY IF EXISTS "Admins can manage file-uploads" ON storage.objects;
CREATE POLICY "Admins can manage file-uploads"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'file-uploads' AND public.is_admin_user(auth.uid()))
WITH CHECK (bucket_id = 'file-uploads' AND public.is_admin_user(auth.uid()));

-- 2. Add original CSV path to file_uploads
ALTER TABLE public.file_uploads
  ADD COLUMN IF NOT EXISTS original_file_path TEXT;

-- 3. Per-row archive — every parsed row, raw data + outcome
CREATE TABLE IF NOT EXISTS public.file_upload_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',           -- pending | success | error
  action TEXT,                                      -- created | updated | skipped
  resulting_record_id TEXT,
  error_messages JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_upload_rows_upload ON public.file_upload_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_file_upload_rows_status ON public.file_upload_rows(upload_id, status);

ALTER TABLE public.file_upload_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage file_upload_rows" ON public.file_upload_rows;
CREATE POLICY "Admins can manage file_upload_rows"
ON public.file_upload_rows
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 4. Generic audit trigger for DELETE/UPDATE on critical tables
CREATE OR REPLACE FUNCTION public.audit_critical_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role TEXT;
BEGIN
  BEGIN
    SELECT role::text INTO _role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN _role := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by, performed_by_role)
    VALUES (TG_TABLE_NAME, COALESCE(OLD.id::text, ''), 'DELETE', to_jsonb(OLD), NULL, auth.uid(), _role);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by, performed_by_role)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, ''), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), _role);
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never block originating transaction due to audit failure
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach DELETE audit triggers to critical tables (UPDATE only on DELETE for size; can extend later)
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['products','services','vendors','customers','categories','restaurants','menu_items'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_delete_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER audit_delete_%I AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_critical_table_change()', t, t);
    END IF;
  END LOOP;
END $$;