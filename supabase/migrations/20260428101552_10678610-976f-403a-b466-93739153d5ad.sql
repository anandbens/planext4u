CREATE OR REPLACE FUNCTION public.get_feed_with_meta(_viewer uuid DEFAULT NULL::uuid, _mode text DEFAULT 'for_you'::text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, post_type text, caption text, media jsonb, product_tags jsonb, hashtags jsonb, category text, status text, is_repost boolean, original_post_id uuid, repost_note text, like_count integer, comment_count integer, save_count integer, share_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, is_edited boolean, author_username text, author_display_name text, author_avatar_url text, author_is_verified boolean, is_liked boolean, is_saved boolean, original_post jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT op.id AS o_id, op.user_id AS o_user_id, op.caption AS o_caption, op.created_at AS o_created_at,
           sp.username AS o_username, sp.display_name AS o_display_name, sp.avatar_url AS o_avatar_url, sp.is_verified AS o_is_verified
    FROM public.social_posts op
    LEFT JOIN public.social_profiles sp ON sp.user_id = op.user_id
    WHERE op.id IN (SELECT b.original_post_id FROM base b WHERE b.original_post_id IS NOT NULL)
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
        'id', o.o_id, 'user_id', o.o_user_id, 'caption', o.o_caption, 'created_at', o.o_created_at,
        'owner', jsonb_build_object(
          'username', o.o_username, 'display_name', o.o_display_name,
          'avatar_url', o.o_avatar_url, 'is_verified', o.o_is_verified
        )
      ) FROM originals o WHERE o.o_id = b.original_post_id
    ) END
  FROM base b
  LEFT JOIN public.social_profiles sp ON sp.user_id = b.user_id
  ORDER BY b.created_at DESC;
END;
$function$;