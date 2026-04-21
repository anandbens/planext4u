-- Add ordering and homepage visibility controls to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories (display_order);
CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage ON public.categories (show_on_homepage) WHERE show_on_homepage = true;

-- Seed sensible defaults so existing categories order alphabetically initially (multiples of 10)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY COALESCE(parent_id,'') ORDER BY name) * 10 AS rn
  FROM public.categories
  WHERE display_order = 999
)
UPDATE public.categories c
SET display_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

-- Platform variables for max counts shown on homepage
INSERT INTO public.platform_variables (id, key, value, description)
VALUES
  ('PV-HOMEPAGE-CAT-MAX', 'homepage_categories_max', '8', 'Max parent categories shown in Shop by Categories on customer homepage'),
  ('PV-HOMEPAGE-SUBCAT-MAX', 'homepage_subcategories_per_parent', '7', 'Max subcategories shown per parent category on customer homepage')
ON CONFLICT (id) DO NOTHING;