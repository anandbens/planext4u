
-- Single-call feed with metadata: posts + author profile + counts + viewer's like/save flags
-- Backward-compatible: returns raw post columns plus meta fields; optional follower-only mode.
CREATE OR REPLACE FUNCTION public.get_feed_with_meta(
  _viewer uuid DEFAULT NULL,
  _mode text DEFAULT 'for_you',
  _limit int DEFAULT 20,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  post_type text,
  caption text,
  media jsonb,
  product_tags jsonb,
  hashtags jsonb,
  category text,
  status text,
  is_repost boolean,
  original_post_id uuid,
  repost_note text,
  like_count int,
  comment_count int,
  save_count int,
  share_count int,
  created_at timestamptz,
  updated_at timestamptz,
  is_edited boolean,
  -- meta
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_is_verified boolean,
  is_liked boolean,
  is_saved boolean,
  original_post jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT p.*
    FROM public.social_posts p
    WHERE p.status = 'published'
      AND (
        _mode <> 'following'
        OR _viewer IS NULL
        OR EXISTS (
          SELECT 1 FROM public.social_follows sf
          WHERE sf.follower_id = _viewer
            AND sf.following_id = p.user_id
            AND sf.status = 'active'
        )
      )
    ORDER BY p.created_at DESC
    LIMIT GREATEST(_limit, 0)
    OFFSET GREATEST(_offset, 0)
  ),
  originals AS (
    SELECT op.id, op.user_id, op.caption, op.created_at,
           sp.username, sp.display_name, sp.avatar_url, sp.is_verified
    FROM public.social_posts op
    LEFT JOIN public.social_profiles sp ON sp.user_id = op.user_id
    WHERE op.id IN (SELECT original_post_id FROM base WHERE original_post_id IS NOT NULL)
  )
  SELECT
    b.id, b.user_id, b.post_type, b.caption, b.media, b.product_tags, b.hashtags,
    b.category, b.status, b.is_repost, b.original_post_id, b.repost_note,
    COALESCE(b.like_count, 0)::int,
    COALESCE(b.comment_count, 0)::int,
    COALESCE(b.save_count, 0)::int,
    COALESCE(b.share_count, 0)::int,
    b.created_at, b.updated_at,
    COALESCE(b.is_edited, false),
    sp.username, sp.display_name, sp.avatar_url, COALESCE(sp.is_verified, false),
    CASE WHEN _viewer IS NULL THEN false ELSE EXISTS (
      SELECT 1 FROM public.social_likes sl WHERE sl.post_id = b.id AND sl.user_id = _viewer
    ) END,
    CASE WHEN _viewer IS NULL THEN false ELSE EXISTS (
      SELECT 1 FROM public.social_bookmarks sb WHERE sb.post_id = b.id AND sb.user_id = _viewer
    ) END,
    CASE WHEN b.original_post_id IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object(
        'id', o.id, 'user_id', o.user_id, 'caption', o.caption, 'created_at', o.created_at,
        'owner', jsonb_build_object(
          'username', o.username, 'display_name', o.display_name,
          'avatar_url', o.avatar_url, 'is_verified', o.is_verified
        )
      ) FROM originals o WHERE o.id = b.original_post_id
    ) END
  FROM base b
  LEFT JOIN public.social_profiles sp ON sp.user_id = b.user_id
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_with_meta(uuid, text, int, int) TO anon, authenticated;
