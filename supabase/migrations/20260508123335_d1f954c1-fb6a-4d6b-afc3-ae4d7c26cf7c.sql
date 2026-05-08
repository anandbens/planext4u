
-- Attach triggers so wallet points are credited on story like and post share.
DROP TRIGGER IF EXISTS trg_social_story_view_change ON public.social_story_views;
CREATE TRIGGER trg_social_story_view_change
AFTER INSERT OR UPDATE ON public.social_story_views
FOR EACH ROW EXECUTE FUNCTION public.handle_social_story_view_change();

DROP TRIGGER IF EXISTS trg_social_share_insert ON public.social_shares;
CREATE TRIGGER trg_social_share_insert
AFTER INSERT ON public.social_shares
FOR EACH ROW EXECUTE FUNCTION public.handle_social_share_insert();

DROP TRIGGER IF EXISTS trg_social_like_change ON public.social_likes;
CREATE TRIGGER trg_social_like_change
AFTER INSERT OR DELETE ON public.social_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_social_like_change();
