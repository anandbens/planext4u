-- Phase 7: Reviews & Ratings enhancements

ALTER TABLE public.food_reviews
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rider_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restaurant_reply text,
  ADD COLUMN IF NOT EXISTS restaurant_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.food_review_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.food_reviews(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, customer_id)
);

ALTER TABLE public.food_review_helpful ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS food_review_helpful_select ON public.food_review_helpful;
CREATE POLICY food_review_helpful_select ON public.food_review_helpful
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS food_review_helpful_insert ON public.food_review_helpful;
CREATE POLICY food_review_helpful_insert ON public.food_review_helpful
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = customer_id);

DROP POLICY IF EXISTS food_review_helpful_delete ON public.food_review_helpful;
CREATE POLICY food_review_helpful_delete ON public.food_review_helpful
  FOR DELETE TO authenticated USING (auth.uid()::text = customer_id);

CREATE OR REPLACE FUNCTION public.recount_food_review_helpful()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.review_id, OLD.review_id);
  UPDATE public.food_reviews
    SET helpful_count = (SELECT count(*) FROM public.food_review_helpful WHERE review_id = rid)
    WHERE id = rid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_recount_food_review_helpful ON public.food_review_helpful;
CREATE TRIGGER trg_recount_food_review_helpful
  AFTER INSERT OR DELETE ON public.food_review_helpful
  FOR EACH ROW EXECUTE FUNCTION public.recount_food_review_helpful();

CREATE OR REPLACE FUNCTION public.touch_food_review()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND (
    NEW.comment IS DISTINCT FROM OLD.comment
    OR NEW.food_rating IS DISTINCT FROM OLD.food_rating
    OR NEW.restaurant_rating IS DISTINCT FROM OLD.restaurant_rating
    OR NEW.rider_rating IS DISTINCT FROM OLD.rider_rating
    OR NEW.photos IS DISTINCT FROM OLD.photos
    OR NEW.tags IS DISTINCT FROM OLD.tags
    OR NEW.rider_tags IS DISTINCT FROM OLD.rider_tags
  ) THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_food_review ON public.food_reviews;
CREATE TRIGGER trg_touch_food_review
  BEFORE UPDATE ON public.food_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_food_review();

CREATE OR REPLACE FUNCTION public.guard_food_review_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid()::text = OLD.customer_id THEN
    IF (NEW.comment IS DISTINCT FROM OLD.comment
        OR NEW.food_rating IS DISTINCT FROM OLD.food_rating
        OR NEW.restaurant_rating IS DISTINCT FROM OLD.restaurant_rating
        OR NEW.rider_rating IS DISTINCT FROM OLD.rider_rating
        OR NEW.photos IS DISTINCT FROM OLD.photos
        OR NEW.tags IS DISTINCT FROM OLD.tags
        OR NEW.rider_tags IS DISTINCT FROM OLD.rider_tags)
       AND now() - OLD.created_at > interval '24 hours' THEN
      RAISE EXCEPTION 'Reviews can only be edited within 24 hours of submission';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_food_review_edit ON public.food_reviews;
CREATE TRIGGER trg_guard_food_review_edit
  BEFORE UPDATE ON public.food_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_food_review_edit();

ALTER TABLE public.food_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS food_reviews_select_public ON public.food_reviews;
CREATE POLICY food_reviews_select_public ON public.food_reviews
  FOR SELECT TO authenticated, anon
  USING (status = 'approved' OR auth.uid()::text = customer_id);

DROP POLICY IF EXISTS food_reviews_insert_self ON public.food_reviews;
CREATE POLICY food_reviews_insert_self ON public.food_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = customer_id);

DROP POLICY IF EXISTS food_reviews_update_self ON public.food_reviews;
CREATE POLICY food_reviews_update_self ON public.food_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = customer_id)
  WITH CHECK (auth.uid()::text = customer_id);

DROP POLICY IF EXISTS food_reviews_update_restaurant ON public.food_reviews;
CREATE POLICY food_reviews_update_restaurant ON public.food_reviews
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = food_reviews.restaurant_id
        AND r.vendor_id = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION public.toggle_food_review_helpful(_review_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid text := auth.uid()::text;
  existing uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth required');
  END IF;
  SELECT id INTO existing FROM public.food_review_helpful
    WHERE review_id = _review_id AND customer_id = uid;
  IF existing IS NOT NULL THEN
    DELETE FROM public.food_review_helpful WHERE id = existing;
    RETURN jsonb_build_object('ok', true, 'voted', false);
  ELSE
    INSERT INTO public.food_review_helpful (review_id, customer_id) VALUES (_review_id, uid);
    RETURN jsonb_build_object('ok', true, 'voted', true);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.toggle_food_review_helpful(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.restaurant_rating_summary AS
SELECT
  restaurant_id,
  COUNT(*)::int AS review_count,
  ROUND(AVG(food_rating)::numeric, 2) AS avg_food,
  ROUND(AVG(restaurant_rating)::numeric, 2) AS avg_restaurant,
  ROUND(AVG(rider_rating)::numeric, 2) AS avg_rider
FROM public.food_reviews
WHERE status = 'approved'
GROUP BY restaurant_id;

GRANT SELECT ON public.restaurant_rating_summary TO anon, authenticated;