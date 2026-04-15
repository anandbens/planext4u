
-- Homepage Sections (content blocks)
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  section_type text NOT NULL DEFAULT 'product_slider',
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  background_color text,
  background_gradient text,
  cta_text text,
  cta_link text,
  festival_tag text,
  target_location text,
  target_segment text,
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_sections" ON public.homepage_sections FOR SELECT USING (true);

-- Homepage Banners (hero carousel slides)
CREATE TABLE public.homepage_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text,
  media_type text NOT NULL DEFAULT 'image',
  media_url text,
  mobile_media_url text,
  cta_text text,
  cta_link text,
  redirect_type text DEFAULT 'url',
  redirect_id text,
  theme_header_color text,
  theme_bg_color text,
  theme_button_color text,
  background_gradient text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  festival_tag text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_banners" ON public.homepage_banners FOR SELECT USING (true);

-- Section Items (items within content blocks)
CREATE TABLE public.homepage_section_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'product',
  item_id text,
  title text,
  image_url text,
  link text,
  display_order integer NOT NULL DEFAULT 0,
  badge_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_section_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_section_items" ON public.homepage_section_items FOR SELECT USING (true);

-- Video Ads (portrait fullscreen overlay)
CREATE TABLE public.video_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  thumbnail_url text,
  duration_seconds integer,
  cta_text text,
  cta_link text,
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz,
  end_date timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read video_ads" ON public.video_ads FOR SELECT USING (true);

-- Homepage Analytics
CREATE TABLE public.homepage_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'impression',
  user_id text,
  session_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert homepage_analytics" ON public.homepage_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read homepage_analytics" ON public.homepage_analytics FOR SELECT USING (true);
