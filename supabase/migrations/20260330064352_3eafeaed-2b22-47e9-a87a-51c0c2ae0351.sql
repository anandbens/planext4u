-- =============================================
-- P4U SOCIAL MODULE - COMPLETE DATABASE SCHEMA
-- =============================================

-- Social profiles (extension of existing profiles table)
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  website text DEFAULT '',
  pronouns text DEFAULT '',
  category text DEFAULT '',
  location text DEFAULT '',
  avatar_url text DEFAULT '',
  account_type text NOT NULL DEFAULT 'personal',
  is_verified boolean DEFAULT false,
  is_private boolean DEFAULT false,
  follower_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social follows
CREATE TABLE IF NOT EXISTS public.social_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  is_close_friend boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Social posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type text NOT NULL DEFAULT 'photo',
  caption text DEFAULT '',
  location_name text DEFAULT '',
  media jsonb DEFAULT '[]'::jsonb,
  hashtags text[] DEFAULT '{}',
  tagged_users jsonb DEFAULT '[]'::jsonb,
  product_tags jsonb DEFAULT '[]'::jsonb,
  audience text DEFAULT 'public',
  hide_like_count boolean DEFAULT false,
  allow_comments text DEFAULT 'everyone',
  allow_remix boolean DEFAULT true,
  is_ai_generated boolean DEFAULT false,
  is_collab boolean DEFAULT false,
  collab_user_id uuid,
  is_pinned boolean DEFAULT false,
  is_repost boolean DEFAULT false,
  original_post_id uuid,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  status text DEFAULT 'active',
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social likes
CREATE TABLE IF NOT EXISTS public.social_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  reaction_type text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Social comments
CREATE TABLE IF NOT EXISTS public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.social_comments(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  like_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Social bookmarks (saves)
CREATE TABLE IF NOT EXISTS public.social_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  collection_name text DEFAULT 'All Posts',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Social stories
CREATE TABLE IF NOT EXISTS public.social_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text DEFAULT '',
  media_type text DEFAULT 'photo',
  background_color text DEFAULT '',
  text_content text DEFAULT '',
  stickers jsonb DEFAULT '[]'::jsonb,
  audience text DEFAULT 'public',
  view_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Story views
CREATE TABLE IF NOT EXISTS public.social_story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.social_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  reaction text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Story highlights
CREATE TABLE IF NOT EXISTS public.social_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  cover_url text DEFAULT '',
  story_ids jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Direct messages conversations
CREATE TABLE IF NOT EXISTS public.social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  group_name text DEFAULT '',
  group_photo text DEFAULT '',
  participants jsonb DEFAULT '[]'::jsonb,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.social_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_type text DEFAULT 'text',
  content text DEFAULT '',
  media_url text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  is_vanish boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Social notifications
CREATE TABLE IF NOT EXISTS public.social_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  reference_id uuid,
  reference_type text DEFAULT '',
  message text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Hashtags
CREATE TABLE IF NOT EXISTS public.social_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  post_count integer DEFAULT 0,
  is_trending boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS public.social_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL REFERENCES public.social_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Audio library
CREATE TABLE IF NOT EXISTS public.social_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  artist text DEFAULT '',
  genre text DEFAULT '',
  audio_url text DEFAULT '',
  cover_url text DEFAULT '',
  duration_seconds integer DEFAULT 0,
  use_count integer DEFAULT 0,
  is_trending boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Broadcast channels
CREATE TABLE IF NOT EXISTS public.social_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  cover_url text DEFAULT '',
  member_count integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Content reports
CREATE TABLE IF NOT EXISTS public.social_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  details text DEFAULT '',
  status text DEFAULT 'pending',
  admin_note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Notes (status-style short text)
CREATE TABLE IF NOT EXISTS public.social_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  audience text DEFAULT 'followers',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Admin social config
CREATE TABLE IF NOT EXISTS public.social_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text DEFAULT '',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_config ENABLE ROW LEVEL SECURITY;

-- Public read for most social tables
CREATE POLICY "Public read social_profiles" ON public.social_profiles FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_posts" ON public.social_posts FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_comments" ON public.social_comments FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_likes" ON public.social_likes FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_stories" ON public.social_stories FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_hashtags" ON public.social_hashtags FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_audio" ON public.social_audio FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_channels" ON public.social_channels FOR SELECT TO public USING (true);
CREATE POLICY "Public read social_config" ON public.social_config FOR SELECT TO public USING (true);

-- Auth users can manage own data
CREATE POLICY "Auth insert social_profiles" ON public.social_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update own social_profiles" ON public.social_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Auth insert social_posts" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update own social_posts" ON public.social_posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth delete own social_posts" ON public.social_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Auth insert social_follows" ON public.social_follows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read social_follows" ON public.social_follows FOR SELECT TO public USING (true);
CREATE POLICY "Auth delete own social_follows" ON public.social_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

CREATE POLICY "Auth insert social_likes" ON public.social_likes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete own social_likes" ON public.social_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Auth insert social_comments" ON public.social_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete own social_comments" ON public.social_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Auth manage own social_bookmarks" ON public.social_bookmarks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Public read social_bookmarks" ON public.social_bookmarks FOR SELECT TO public USING (true);

CREATE POLICY "Auth insert social_stories" ON public.social_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete own social_stories" ON public.social_stories FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Auth insert social_story_views" ON public.social_story_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Public read social_story_views" ON public.social_story_views FOR SELECT TO public USING (true);

CREATE POLICY "Auth manage own social_highlights" ON public.social_highlights FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Public read social_highlights" ON public.social_highlights FOR SELECT TO public USING (true);

CREATE POLICY "Auth manage social_conversations" ON public.social_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage social_messages" ON public.social_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage own social_notifications" ON public.social_notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Auth insert social_comment_likes" ON public.social_comment_likes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete own social_comment_likes" ON public.social_comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Public read social_comment_likes" ON public.social_comment_likes FOR SELECT TO public USING (true);

CREATE POLICY "Auth insert social_reports" ON public.social_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage social_reports" ON public.social_reports FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Auth manage own social_notes" ON public.social_notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Public read social_notes" ON public.social_notes FOR SELECT TO public USING (true);

-- Admin policies for management
CREATE POLICY "Admins manage social_profiles" ON public.social_profiles FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_posts" ON public.social_posts FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_hashtags" ON public.social_hashtags FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_audio" ON public.social_audio FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_channels" ON public.social_channels FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_config" ON public.social_config FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Admins manage social_comments" ON public.social_comments FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Enable realtime for social posts and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_follows_follower ON public.social_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_following ON public.social_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_post ON public.social_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON public.social_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_user ON public.social_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_user ON public.social_notifications(user_id);

-- Insert default config
INSERT INTO public.social_config (key, value, description) VALUES
  ('max_hashtags_per_post', '3', 'Maximum hashtags per post'),
  ('max_story_segments', '30', 'Max story segments per day'),
  ('reel_max_duration', '90', 'Max reel duration in seconds'),
  ('product_tagging_enabled', 'true', 'Enable product tagging on posts'),
  ('trial_reels_enabled', 'true', 'Enable trial reels for creators'),
  ('remix_enabled', 'true', 'Enable reel remix globally'),
  ('collab_posts_enabled', 'true', 'Enable collaborative posts'),
  ('broadcast_channels_enabled', 'true', 'Enable broadcast channels'),
  ('ai_restyle_enabled', 'false', 'Enable AI restyle in stories'),
  ('feed_algorithm', 'blended', 'Default feed algorithm')
ON CONFLICT (key) DO NOTHING;

-- Create storage bucket for social media
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;