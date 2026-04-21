-- 1. Add category_type column with default 'product'
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'product';

-- 2. Constrain to allowed values
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_category_type_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_category_type_check
  CHECK (category_type IN ('product', 'service'));

-- 3. Backfill existing rows to 'product' (default already covers, but explicit for clarity)
UPDATE public.categories SET category_type = 'product' WHERE category_type IS NULL;

-- 4. Index for filtered queries
CREATE INDEX IF NOT EXISTS idx_categories_category_type ON public.categories(category_type);

-- 5. Trigger: subcategories inherit parent's category_type automatically
CREATE OR REPLACE FUNCTION public.sync_subcategory_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_type text;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT category_type INTO parent_type FROM public.categories WHERE id = NEW.parent_id;
    IF parent_type IS NOT NULL THEN
      NEW.category_type := parent_type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subcategory_type ON public.categories;
CREATE TRIGGER trg_sync_subcategory_type
BEFORE INSERT OR UPDATE OF parent_id, category_type ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.sync_subcategory_type();