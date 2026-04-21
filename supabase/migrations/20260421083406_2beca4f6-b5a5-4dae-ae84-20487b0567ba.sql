-- ── Homepage Layout Builder (module-scoped) ─────────────────────────────────
-- A single layout per (module, name) holds an ordered list of sections.
-- Each section has a widget type and a JSON config blob the renderer reads.

CREATE TABLE IF NOT EXISTS public.homepage_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('ecommerce','food','homes','socio')),
  name text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, name)
);

CREATE TABLE IF NOT EXISTS public.homepage_layout_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid NOT NULL REFERENCES public.homepage_layouts(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text,
  display_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_layout_sections_layout
  ON public.homepage_layout_sections(layout_id, display_order);

-- updated_at triggers
CREATE TRIGGER trg_layouts_updated_at
  BEFORE UPDATE ON public.homepage_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_layout_sections_updated_at
  BEFORE UPDATE ON public.homepage_layout_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.homepage_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_layout_sections ENABLE ROW LEVEL SECURITY;

-- Public read of the active layout (anyone can render the homepage)
CREATE POLICY "Anyone can read active layouts"
  ON public.homepage_layouts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read sections of active layouts"
  ON public.homepage_layout_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.homepage_layouts l
    WHERE l.id = homepage_layout_sections.layout_id AND l.is_active = true
  ));

-- Admin full control
CREATE POLICY "Admins manage layouts"
  ON public.homepage_layouts FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins manage layout sections"
  ON public.homepage_layout_sections FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ── Seed one default layout per module ──────────────────────────────────────
INSERT INTO public.homepage_layouts (module, name, is_active)
VALUES
  ('ecommerce','default', true),
  ('food','default', true),
  ('homes','default', true),
  ('socio','default', true)
ON CONFLICT (module, name) DO NOTHING;

-- Default ecommerce sections (mirroring current Zepto-style home)
WITH l AS (SELECT id FROM public.homepage_layouts WHERE module='ecommerce' AND name='default')
INSERT INTO public.homepage_layout_sections (layout_id, widget_type, title, display_order, config)
SELECT l.id, x.widget_type, x.title, x.display_order, x.config::jsonb FROM l, (VALUES
  ('hero_carousel',          'Hero',                  10, '{}'),
  ('category_grid',          'Shop by Category',      20, '{"limit":12,"columns":4}'),
  ('deals_of_day',           'Deals of the Day',      30, '{"limit":10}'),
  ('trending_products',      'Trending Now',          40, '{"limit":10}'),
  ('category_product_row',   'Top Picks',             50, '{"limit":10}'),
  ('featured_vendors',       'Featured Vendors',      60, '{"limit":8}'),
  ('promo_strip',            'Premium Promo',         70, '{"variant":"aurora","title":"Get free delivery on orders over ₹499","cta_text":"Shop now","cta_link":"/app/browse"}'),
  ('classifieds_strip',      'Classifieds Near You',  80, '{"limit":6}')
) AS x(widget_type, title, display_order, config);

-- Default food sections
WITH l AS (SELECT id FROM public.homepage_layouts WHERE module='food' AND name='default')
INSERT INTO public.homepage_layout_sections (layout_id, widget_type, title, display_order, config)
SELECT l.id, x.widget_type, x.title, x.display_order, x.config::jsonb FROM l, (VALUES
  ('food_hero',             'Food Hero',              10, '{}'),
  ('food_quick_filters',    'Cuisines',               20, '{}'),
  ('food_top_restaurants',  'Top Restaurants',        30, '{"limit":10}'),
  ('food_offers_strip',     'Today''s Offers',        40, '{}'),
  ('food_restaurant_grid',  'All Restaurants',        50, '{}')
) AS x(widget_type, title, display_order, config);

-- Default homes sections
WITH l AS (SELECT id FROM public.homepage_layouts WHERE module='homes' AND name='default')
INSERT INTO public.homepage_layout_sections (layout_id, widget_type, title, display_order, config)
SELECT l.id, x.widget_type, x.title, x.display_order, x.config::jsonb FROM l, (VALUES
  ('homes_hero',            'Homes Hero',             10, '{}'),
  ('homes_quick_actions',   'Quick Actions',          20, '{}'),
  ('homes_popular_localities','Popular Localities',   30, '{}'),
  ('homes_featured',        'Featured Properties',    40, '{"limit":12}'),
  ('homes_services_grid',   'Home Services',          50, '{}')
) AS x(widget_type, title, display_order, config);

-- Default socio sections
WITH l AS (SELECT id FROM public.homepage_layouts WHERE module='socio' AND name='default')
INSERT INTO public.homepage_layout_sections (layout_id, widget_type, title, display_order, config)
SELECT l.id, x.widget_type, x.title, x.display_order, x.config::jsonb FROM l, (VALUES
  ('socio_stories_strip',   'Stories',                10, '{}'),
  ('socio_feed',            'Feed',                   20, '{}')
) AS x(widget_type, title, display_order, config);