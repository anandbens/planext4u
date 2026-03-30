import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Plus, Grid3X3, Film, Bookmark, Users, MoreHorizontal, ChevronDown, UserPlus, Bookmark as BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollow } from "@/hooks/use-social-interactions";

function Bell(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function SocialProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { customerUser } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");

  const currentUserId = customerUser?.id;
  const profileUsername = username?.replace('@', '');

  // Fetch social profile from DB
  const { data: profile } = useQuery({
    queryKey: ['social-profile', profileUsername, currentUserId],
    queryFn: async () => {
      let query = supabase.from('social_profiles').select('*');
      if (profileUsername) {
        query = query.eq('username', profileUsername);
      } else if (currentUserId) {
        query = query.eq('user_id', currentUserId);
      } else {
        return null;
      }
      const { data } = await query.maybeSingle();
      return data;
    },
  });

  const isOwnProfile = !profileUsername || profile?.user_id === currentUserId;
  const targetUserId = profile?.user_id || '';

  // Follow hook
  const { isFollowing, toggleFollow } = useFollow(targetUserId);

  // Fetch user's posts from DB
  const { data: userPosts = [] } = useQuery({
    queryKey: ['social-user-posts', targetUserId, activeTab],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data } = await supabase
        .from('social_posts')
        .select('id, media, post_type, like_count, comment_count')
        .eq('user_id', targetUserId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Fetch saved posts for own profile
  const { data: savedPosts = [] } = useQuery({
    queryKey: ['social-saved-posts', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase
        .from('social_bookmarks')
        .select('post_id, social_posts(id, media, post_type, like_count)')
        .eq('user_id', currentUserId)
        .limit(30);
      return (data || []).map((b: any) => b.social_posts).filter(Boolean);
    },
    enabled: isOwnProfile && activeTab === 'saved' && !!currentUserId,
  });

  // Follower/following counts from DB
  const { data: followerCount = 0 } = useQuery({
    queryKey: ['social-follower-count', targetUserId],
    queryFn: async () => {
      const { count } = await supabase.from('social_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId).eq('status', 'active');
      return count || 0;
    },
    enabled: !!targetUserId,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ['social-following-count', targetUserId],
    queryFn: async () => {
      const { count } = await supabase.from('social_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId).eq('status', 'active');
      return count || 0;
    },
    enabled: !!targetUserId,
  });

  const displayName = profile?.display_name || customerUser?.name || "User";
  const displayUsername = profile?.username || customerUser?.name || "user";
  const bio = profile?.bio || "";
  const isVerified = profile?.is_verified || false;
  const postCount = profile?.post_count || userPosts.length;
  const avatarUrl = profile?.avatar_url || '';

  const displayPosts = activeTab === 'saved' ? savedPosts : userPosts.filter((p: any) => activeTab === 'reels' ? p.post_type === 'reel' : true);

  const content = (
    <div className="pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center justify-between px-4 py-3 max-w-xl mx-auto">
          <div className="flex items-center gap-2">
            {!isOwnProfile && <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6" /></button>}
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold">{displayUsername}</span>
              {isVerified && <svg className="h-4 w-4 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <>
                <button onClick={() => navigate("/app/social/notifications")}><Bell className="h-6 w-6" /></button>
                <Link to="/app/social/create"><Plus className="h-6 w-6" /></Link>
                <button onClick={() => navigate("/app/social/settings")}><MoreHorizontal className="h-6 w-6" /></button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto">
        {/* Profile Info */}
        <div className="px-4 pt-4">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center border-2 border-border overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{displayUsername.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <Plus className="h-3 w-3 text-primary-foreground" />
                </button>
              )}
            </div>
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <p className="text-lg font-bold">{postCount}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <button className="text-center" onClick={() => navigate(`/app/social/@${displayUsername}/followers`)}>
                <p className="text-lg font-bold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </button>
              <button className="text-center" onClick={() => navigate(`/app/social/@${displayUsername}/followers?tab=following`)}>
                <p className="text-lg font-bold">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold">{displayName}</p>
            {bio && <p className="text-sm whitespace-pre-line">{bio}</p>}
            {profile?.website && <a href={profile.website} className="text-sm text-primary" target="_blank" rel="noopener noreferrer">{profile.website}</a>}
          </div>

          <div className="flex gap-2 mt-4">
            {isOwnProfile ? (
              <>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => navigate("/app/social/edit-profile")}>
                  Edit Profile
                </Button>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/app/social/@${displayUsername}`);
                  toast.success("Profile link copied!");
                }}>
                  Share Profile
                </Button>
                <Button variant="secondary" className="h-9 w-9 p-0" onClick={() => navigate("/app/social/explore")}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  className={`flex-1 h-9 text-sm font-semibold`}
                  variant={isFollowing ? "secondary" : "default"}
                  onClick={() => toggleFollow()}
                >
                  {isFollowing ? <span className="flex items-center gap-1">Following <ChevronDown className="h-3 w-3" /></span> : "Follow"}
                </Button>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => navigate("/app/social/messages")}>
                  Message
                </Button>
                <Button variant="secondary" className="h-9 w-9 p-0">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Grid Tabs */}
        <div className="border-t border-border/30 mt-4">
          <div className="flex">
            {[
              { key: 'posts', icon: Grid3X3 },
              { key: 'reels', icon: Film },
              ...(isOwnProfile ? [{ key: 'saved', icon: Bookmark }] : []),
              { key: 'tagged', icon: Users },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${activeTab === tab.key ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
              >
                <tab.icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {(activeTab === 'posts' || activeTab === 'reels' || activeTab === 'saved') && displayPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {displayPosts.map((post: any) => {
              const media = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;
              return (
                <button key={post.id} className="aspect-square bg-muted relative overflow-hidden group" onClick={() => navigate(`/app/social/post/${post.id}`)}>
                  {media?.url ? (
                    <img src={media.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-accent/30" />
                  )}
                  {post.post_type === 'reel' && <div className="absolute top-2 right-2"><Film className="h-4 w-4 text-white drop-shadow" /></div>}
                  {post.post_type === 'carousel' && (
                    <div className="absolute top-2 right-2">
                      <svg className="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : activeTab === 'tagged' ? (
          <div className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">Photos of you</p>
            <p className="text-xs text-muted-foreground mt-1">When people tag you in photos, they'll appear here</p>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">No Posts Yet</p>
            <p className="text-xs text-muted-foreground mt-1">{isOwnProfile ? "Share your first photo or reel" : "This user hasn't posted yet"}</p>
            {isOwnProfile && (
              <Button size="sm" className="mt-3" onClick={() => navigate("/app/social/create")}>Create Post</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
