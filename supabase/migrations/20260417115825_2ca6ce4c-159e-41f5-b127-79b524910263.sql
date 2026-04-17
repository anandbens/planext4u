
-- Add tombstone columns for "Message deleted" experience
ALTER TABLE public.social_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_social_messages_deleted_at ON public.social_messages(deleted_at);

-- Helper: get list of mutual followers between two users (for "Followed by" chip)
CREATE OR REPLACE FUNCTION public.get_mutual_followers(_viewer uuid, _profile uuid, _limit int DEFAULT 3)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- People the viewer follows who also follow the profile
  SELECT sp.user_id, sp.username, sp.display_name, sp.avatar_url
  FROM public.social_follows f1
  JOIN public.social_follows f2
    ON f2.follower_id = f1.following_id
   AND f2.following_id = _profile
   AND f2.status = 'active'
  JOIN public.social_profiles sp ON sp.user_id = f1.following_id
  WHERE f1.follower_id = _viewer
    AND f1.status = 'active'
    AND f1.following_id <> _profile
  LIMIT _limit;
$$;

-- Helper: count of mutual followers (for "and N others")
CREATE OR REPLACE FUNCTION public.count_mutual_followers(_viewer uuid, _profile uuid)
RETURNS INT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.social_follows f1
  JOIN public.social_follows f2
    ON f2.follower_id = f1.following_id
   AND f2.following_id = _profile
   AND f2.status = 'active'
  WHERE f1.follower_id = _viewer
    AND f1.status = 'active'
    AND f1.following_id <> _profile;
$$;

-- Helper: friends-of-friends suggestions (people followed by people you follow, but not by you)
CREATE OR REPLACE FUNCTION public.get_friends_of_friends(_user uuid, _limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_count int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_follows AS (
    SELECT following_id FROM public.social_follows
    WHERE follower_id = _user AND status = 'active'
  ),
  candidates AS (
    SELECT f2.following_id AS candidate_id, COUNT(*)::int AS mutual_count
    FROM public.social_follows f2
    WHERE f2.follower_id IN (SELECT following_id FROM my_follows)
      AND f2.status = 'active'
      AND f2.following_id <> _user
      AND f2.following_id NOT IN (SELECT following_id FROM my_follows)
    GROUP BY f2.following_id
  )
  SELECT sp.user_id, sp.username, sp.display_name, sp.avatar_url, c.mutual_count
  FROM candidates c
  JOIN public.social_profiles sp ON sp.user_id = c.candidate_id
  ORDER BY c.mutual_count DESC, sp.follower_count DESC NULLS LAST
  LIMIT _limit;
$$;

-- Mark social_posts.is_repost / original_post_id as fully indexed for repost tab
CREATE INDEX IF NOT EXISTS idx_social_posts_original_post ON public.social_posts(original_post_id) WHERE is_repost = true;
CREATE INDEX IF NOT EXISTS idx_social_posts_user_repost ON public.social_posts(user_id, is_repost);

-- Add a "repost note" column for the optional thought-bubble note when reposting
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS repost_note TEXT;

GRANT EXECUTE ON FUNCTION public.get_mutual_followers(uuid, uuid, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.count_mutual_followers(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_of_friends(uuid, int) TO authenticated;
