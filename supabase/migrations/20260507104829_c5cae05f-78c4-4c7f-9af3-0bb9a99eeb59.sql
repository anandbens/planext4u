ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_service_categories_display_order ON public.service_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_service_categories_parent_id ON public.service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_show_on_homepage ON public.service_categories(show_on_homepage) WHERE show_on_homepage = true;