
-- Add new columns to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS banner_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Add new columns to service_categories
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS banner_image text DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- States table
CREATE TABLE IF NOT EXISTS public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "States publicly readable" ON public.states FOR SELECT USING (true);
CREATE POLICY "Admins manage states" ON public.states FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Districts publicly readable" ON public.districts FOR SELECT USING (true);
CREATE POLICY "Admins manage districts" ON public.districts FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Media library table
CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_size integer DEFAULT 0,
  alt_text text DEFAULT '',
  tags text[] DEFAULT '{}',
  folder text DEFAULT 'general',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media publicly readable" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "Admins manage media" ON public.media_library FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Storage bucket for media library
INSERT INTO storage.buckets (id, name, public) VALUES ('media-library', 'media-library', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Media library public read" ON storage.objects FOR SELECT USING (bucket_id = 'media-library');
CREATE POLICY "Admins upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media-library' AND is_admin_user(auth.uid()));
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media-library' AND is_admin_user(auth.uid()));
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media-library' AND is_admin_user(auth.uid()));
