-- Add publish snapshot + metadata to homepage_layouts
ALTER TABLE public.homepage_layouts
  ADD COLUMN IF NOT EXISTS published_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS has_unpublished_changes boolean NOT NULL DEFAULT true;

-- Mark a layout dirty whenever any of its draft sections change
CREATE OR REPLACE FUNCTION public.mark_homepage_layout_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layout_id uuid;
BEGIN
  v_layout_id := COALESCE(NEW.layout_id, OLD.layout_id);
  IF v_layout_id IS NOT NULL THEN
    UPDATE public.homepage_layouts
       SET has_unpublished_changes = true,
           updated_at = now()
     WHERE id = v_layout_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_layout_sections_dirty ON public.homepage_layout_sections;
CREATE TRIGGER trg_layout_sections_dirty
AFTER INSERT OR UPDATE OR DELETE ON public.homepage_layout_sections
FOR EACH ROW EXECUTE FUNCTION public.mark_homepage_layout_dirty();

-- Backfill: treat current live state as the initial published snapshot so customer pages don't go blank
UPDATE public.homepage_layouts l
   SET published_snapshot = COALESCE(
         (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.display_order)
            FROM public.homepage_layout_sections s
           WHERE s.layout_id = l.id),
         '[]'::jsonb),
       published_at = COALESCE(l.published_at, now()),
       has_unpublished_changes = false
 WHERE l.published_snapshot IS NULL;