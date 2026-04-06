CREATE OR REPLACE FUNCTION public.normalize_social_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  generated_username text;
BEGIN
  generated_username := lower(regexp_replace(trim(coalesce(NEW.username, '')), '[^a-zA-Z0-9._]+', '_', 'g'));
  generated_username := regexp_replace(generated_username, '_{2,}', '_', 'g');
  generated_username := trim(both '_' from generated_username);

  IF generated_username = '' THEN
    generated_username := 'user_' || substr(replace(coalesce(NEW.user_id::text, gen_random_uuid()::text), '-', ''), 1, 8);
  END IF;

  IF generated_username !~ '^[a-z0-9._]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only lowercase letters, numbers, dots, or underscores';
  END IF;

  NEW.username := generated_username;
  NEW.display_name := nullif(trim(coalesce(NEW.display_name, '')), '');
  IF NEW.display_name IS NULL THEN
    NEW.display_name := NEW.username;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

UPDATE public.social_profiles
SET username = lower(username),
    display_name = COALESCE(NULLIF(trim(display_name), ''), username),
    updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS social_profiles_username_lower_key
ON public.social_profiles (lower(username));

DROP TRIGGER IF EXISTS trg_social_profiles_normalize ON public.social_profiles;
CREATE TRIGGER trg_social_profiles_normalize
BEFORE INSERT OR UPDATE ON public.social_profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_social_profile();

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER trg_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.refresh_social_profile_counts(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_profiles
  SET follower_count = (
        SELECT count(*)::int
        FROM public.social_follows
        WHERE following_id = _user_id AND status = 'active'
      ),
      following_count = (
        SELECT count(*)::int
        FROM public.social_follows
        WHERE follower_id = _user_id AND status = 'active'
      ),
      post_count = (
        SELECT count(*)::int
        FROM public.social_posts
        WHERE user_id = _user_id AND status = 'published'
      ),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_social_post_counts(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_posts
  SET like_count = (
        SELECT count(*)::int
        FROM public.social_likes
        WHERE post_id = _post_id
      ),
      comment_count = (
        SELECT count(*)::int
        FROM public.social_comments
        WHERE post_id = _post_id AND status = 'active'
      ),
      save_count = (
        SELECT count(*)::int
        FROM public.social_bookmarks
        WHERE post_id = _post_id
      ),
      updated_at = now()
  WHERE id = _post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_social_notification(
  _user_id uuid,
  _actor_id uuid,
  _type text,
  _reference_id uuid,
  _reference_type text,
  _message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _actor_id IS NULL OR _user_id = _actor_id THEN
    RETURN;
  END IF;

  INSERT INTO public.social_notifications (
    user_id,
    actor_id,
    type,
    reference_id,
    reference_type,
    message,
    is_read
  ) VALUES (
    _user_id,
    _actor_id,
    _type,
    _reference_id,
    _reference_type,
    _message,
    false
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_social_follow_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_social_profile_counts(COALESCE(NEW.follower_id, OLD.follower_id));
  PERFORM public.refresh_social_profile_counts(COALESCE(NEW.following_id, OLD.following_id));

  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    PERFORM public.create_social_notification(
      NEW.following_id,
      NEW.follower_id,
      'follow',
      NEW.id,
      'follow',
      'started following you'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active' THEN
    PERFORM public.create_social_notification(
      NEW.following_id,
      NEW.follower_id,
      'follow',
      NEW.id,
      'follow',
      'started following you'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_social_post_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_social_profile_counts(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_social_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id uuid;
  target_owner uuid;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  PERFORM public.refresh_social_post_counts(target_post_id);

  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT user_id INTO target_owner
    FROM public.social_posts
    WHERE id = NEW.post_id;

    PERFORM public.create_social_notification(
      target_owner,
      NEW.user_id,
      CASE WHEN NEW.parent_id IS NULL THEN 'comment' ELSE 'reply' END,
      NEW.id,
      'comment',
      CASE WHEN NEW.parent_id IS NULL THEN 'commented on your post' ELSE 'replied to your comment' END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_social_like_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id uuid;
  target_owner uuid;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  PERFORM public.refresh_social_post_counts(target_post_id);

  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO target_owner
    FROM public.social_posts
    WHERE id = NEW.post_id;

    PERFORM public.create_social_notification(
      target_owner,
      NEW.user_id,
      'like',
      NEW.post_id,
      'post',
      'liked your post'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_social_story_view_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_stories
  SET view_count = (
        SELECT count(*)::int
        FROM public.social_story_views
        WHERE story_id = NEW.story_id
      )
  WHERE id = NEW.story_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_social_follow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RAISE EXCEPTION 'Users cannot follow themselves';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_mutual_followers(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_follows
    WHERE follower_id = _user_a
      AND following_id = _user_b
      AND status = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.social_follows
    WHERE follower_id = _user_b
      AND following_id = _user_a
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.validate_social_conversation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  user_a uuid;
  user_b uuid;
BEGIN
  IF COALESCE(NEW.is_group, false) THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(COALESCE(NEW.participants, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(NEW.participants, '[]'::jsonb)) <> 2 THEN
    RAISE EXCEPTION 'Direct messages require exactly two participants';
  END IF;

  user_a := (NEW.participants ->> 0)::uuid;
  user_b := (NEW.participants ->> 1)::uuid;

  IF user_a = user_b THEN
    RAISE EXCEPTION 'Direct messages require two different users';
  END IF;

  IF user_a::text > user_b::text THEN
    NEW.participants := to_jsonb(ARRAY[user_b::text, user_a::text]);
  ELSE
    NEW.participants := to_jsonb(ARRAY[user_a::text, user_b::text]);
  END IF;

  IF NOT public.are_mutual_followers(user_a, user_b) THEN
    RAISE EXCEPTION 'Direct messages are available only after both users follow each other';
  END IF;

  NEW.last_message_at := COALESCE(NEW.last_message_at, now());
  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS social_conversations_direct_participants_key
ON public.social_conversations ((participants::text))
WHERE is_group = false;

DROP TRIGGER IF EXISTS trg_social_follows_validate ON public.social_follows;
CREATE TRIGGER trg_social_follows_validate
BEFORE INSERT OR UPDATE ON public.social_follows
FOR EACH ROW
EXECUTE FUNCTION public.validate_social_follow();

DROP TRIGGER IF EXISTS trg_social_conversations_validate ON public.social_conversations;
CREATE TRIGGER trg_social_conversations_validate
BEFORE INSERT OR UPDATE ON public.social_conversations
FOR EACH ROW
EXECUTE FUNCTION public.validate_social_conversation();

DROP TRIGGER IF EXISTS trg_social_follows_after_change ON public.social_follows;
CREATE TRIGGER trg_social_follows_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.social_follows
FOR EACH ROW
EXECUTE FUNCTION public.handle_social_follow_change();

DROP TRIGGER IF EXISTS trg_social_posts_after_change ON public.social_posts;
CREATE TRIGGER trg_social_posts_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_social_post_change();

DROP TRIGGER IF EXISTS trg_social_comments_after_change ON public.social_comments;
CREATE TRIGGER trg_social_comments_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.social_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_social_comment_change();

DROP TRIGGER IF EXISTS trg_social_likes_after_change ON public.social_likes;
CREATE TRIGGER trg_social_likes_after_change
AFTER INSERT OR DELETE ON public.social_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_social_like_change();

DROP TRIGGER IF EXISTS trg_social_story_views_after_insert ON public.social_story_views;
CREATE TRIGGER trg_social_story_views_after_insert
AFTER INSERT ON public.social_story_views
FOR EACH ROW
EXECUTE FUNCTION public.handle_social_story_view_change();

DROP POLICY IF EXISTS "Auth insert social_profiles" ON public.social_profiles;
CREATE POLICY "Auth insert social_profiles"
ON public.social_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth update own social_profiles" ON public.social_profiles;
CREATE POLICY "Auth update own social_profiles"
ON public.social_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_posts" ON public.social_posts;
CREATE POLICY "Auth insert social_posts"
ON public.social_posts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth update own social_posts" ON public.social_posts;
CREATE POLICY "Auth update own social_posts"
ON public.social_posts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_comments" ON public.social_comments;
CREATE POLICY "Auth insert social_comments"
ON public.social_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_likes" ON public.social_likes;
CREATE POLICY "Auth insert social_likes"
ON public.social_likes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_comment_likes" ON public.social_comment_likes;
CREATE POLICY "Auth insert social_comment_likes"
ON public.social_comment_likes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_stories" ON public.social_stories;
CREATE POLICY "Auth insert social_stories"
ON public.social_stories
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_story_views" ON public.social_story_views;
CREATE POLICY "Auth insert social_story_views"
ON public.social_story_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "Auth insert social_reports" ON public.social_reports;
CREATE POLICY "Auth insert social_reports"
ON public.social_reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

SELECT public.refresh_social_profile_counts(user_id)
FROM public.social_profiles;

SELECT public.refresh_social_post_counts(id)
FROM public.social_posts;