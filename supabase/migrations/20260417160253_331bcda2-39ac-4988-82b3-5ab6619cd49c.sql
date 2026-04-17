
CREATE OR REPLACE FUNCTION public.refresh_social_comment_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.comment_id, OLD.comment_id);
  UPDATE public.social_comments
    SET like_count = (SELECT count(*)::int FROM public.social_comment_likes WHERE comment_id = cid)
    WHERE id = cid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_social_comment_likes_count ON public.social_comment_likes;
CREATE TRIGGER trg_social_comment_likes_count
AFTER INSERT OR DELETE ON public.social_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.refresh_social_comment_like_count();

-- Backfill existing counts
UPDATE public.social_comments c
  SET like_count = COALESCE((SELECT count(*)::int FROM public.social_comment_likes l WHERE l.comment_id = c.id), 0);
