-- Add edit tracking columns
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

ALTER TABLE public.social_stories
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Allow story owners to update their own stories (only while still active i.e. not expired)
DROP POLICY IF EXISTS "Auth update own social_stories" ON public.social_stories;
CREATE POLICY "Auth update own social_stories"
ON public.social_stories
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND expires_at > now())
WITH CHECK (user_id = auth.uid() AND expires_at > now());

-- Trigger: when an owner edits caption/media/audience/etc., flag is_edited + edited_at
CREATE OR REPLACE FUNCTION public.mark_social_post_edited()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only flag when actual user-facing content changed (skip system columns like counters)
  IF (NEW.caption IS DISTINCT FROM OLD.caption
      OR NEW.location_name IS DISTINCT FROM OLD.location_name
      OR NEW.media IS DISTINCT FROM OLD.media
      OR NEW.hashtags IS DISTINCT FROM OLD.hashtags
      OR NEW.tagged_users IS DISTINCT FROM OLD.tagged_users
      OR NEW.product_tags IS DISTINCT FROM OLD.product_tags
      OR NEW.audience IS DISTINCT FROM OLD.audience
      OR NEW.hide_like_count IS DISTINCT FROM OLD.hide_like_count
      OR NEW.allow_comments IS DISTINCT FROM OLD.allow_comments) THEN
    NEW.is_edited := true;
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_social_post_edited ON public.social_posts;
CREATE TRIGGER trg_mark_social_post_edited
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.mark_social_post_edited();

CREATE OR REPLACE FUNCTION public.mark_social_story_edited()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.text_content IS DISTINCT FROM OLD.text_content
      OR NEW.background_color IS DISTINCT FROM OLD.background_color
      OR NEW.stickers IS DISTINCT FROM OLD.stickers
      OR NEW.audience IS DISTINCT FROM OLD.audience
      OR NEW.media_url IS DISTINCT FROM OLD.media_url) THEN
    NEW.is_edited := true;
    NEW.edited_at := now();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_social_story_edited ON public.social_stories;
CREATE TRIGGER trg_mark_social_story_edited
BEFORE UPDATE ON public.social_stories
FOR EACH ROW EXECUTE FUNCTION public.mark_social_story_edited();