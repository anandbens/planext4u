
-- Parent Items master table
CREATE TABLE public.parent_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parent items" ON public.parent_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage parent items" ON public.parent_items FOR ALL USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_parent_items_updated_at BEFORE UPDATE ON public.parent_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add parent item columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS parent_item_id text REFERENCES public.parent_items(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS parent_item_name text;

-- File Uploads tracking table
CREATE TABLE public.file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  upload_type text NOT NULL DEFAULT 'product',
  status text NOT NULL DEFAULT 'processing',
  total_records int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  uploaded_by text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view file uploads" ON public.file_uploads FOR SELECT USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can manage file uploads" ON public.file_uploads FOR ALL USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON public.file_uploads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
