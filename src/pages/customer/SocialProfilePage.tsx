import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Plus, Grid3X3, Film, Bookmark, Users, MoreHorizontal, ChevronDown, UserPlus, Bookmark as BookmarkIcon, Play } from "lucide-react";
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
  const { username, userId: routeUserId } = useParams();
  const { customerUser } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const queryClient = useQueryClient();

  const currentUserId = customerUser?.supabase_uid || customerUser?.id;
  const profileUsername = username?.replace('@', '');

  // Fetch social profile from DB — supports both username and userId routes
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['social-profile', profileUsername, routeUserId, currentUserId],
    queryFn: async () => {
      let query = supabase.from('social_profiles').select('*');
      if (profileUsername) {
        query = query.eq('username', profileUsername);
      } else if (routeUserId) {
        query = query.eq('user_id', routeUserId);
      } else if (currentUserId) {
        query = query.eq('user_id', currentUserId);
      } else {
        return null;
      }
      const { data } = await query.maybeSingle();
      return data;
    },
  });

  const isOwnProfile = (!profileUsername && !routeUserId) || profile?.user_id === currentUserId;
  const targetUserId = profile?.user_id || '';

  // Follow hook — with count invalidation on toggle
  const { isFollowing, toggleFollow: rawToggleFollow } = useFollow(targetUserId);
  const handleToggleFollow = () => {
    rawToggleFollow();
    // Invalidate counts after a short delay to let the mutation settle
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['social-follower-count', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['social-following-count', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['social-followed-by', targetUserId, currentUserId] });
    }, 500);
  };

  // Check if the other user follows us back (mutual follow for messaging)
  const { data: isFollowedBy = false } = useQuery({
    queryKey: ['social-followed-by', targetUserId, currentUserId],
    queryFn: async () => {
      if (!targetUserId || !currentUserId || targetUserId === currentUserId) return false;
      const { count } = await supabase
        .from('social_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId)
        .eq('following_id', currentUserId)
        .eq('status', 'active');
      return (count || 0) > 0;
    },
    enabled: !!targetUserId && !!currentUserId && !isOwnProfile,
  });

  const isMutualFollow = isFollowing && isFollowedBy;

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

  const displayName = profile?.display_name || (profileUsername ? profileUsername.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : customerUser?.name || "User");
  const displayUsername = profile?.username || profileUsername || customerUser?.name || "user";
  const bio = profile?.bio || "";
  const isVerified = profile?.is_verified || false;
  const postCount = profile?.post_count || userPosts.length;
  const avatarUrl = profile?.avatar_url || '';

  // Fetch tagged posts (posts where this user is tagged)
  const { data: taggedPosts = [] } = useQuery({
    queryKey: ['social-tagged-posts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      // tagged_users is a jsonb array like [{id: "...", username: "..."}]
      // Search for posts where tagged_users contains an object with this user's id
      const { data } = await supabase
        .from('social_posts')
        .select('id, media, post_type, like_count, comment_count')
        .eq('status', 'published')
        .not('tagged_users', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      // Client-side filter since jsonb containment with nested objects is complex
      return (data || []).filter((p: any) => {
        const tags = Array.isArray(p.tagged_users) ? p.tagged_users : [];
        return tags.some((t: any) => t.id === targetUserId);
      });
    },
    enabled: !!targetUserId && activeTab === 'tagged',
  });

  const displayPosts = activeTab === 'saved' ? savedPosts : activeTab === 'tagged' ? taggedPosts : userPosts.filter((p: any) => activeTab === 'reels' ? p.post_type === 'reel' : true);

  // Profile not found state
  if (!profileLoading && !profile && (profileUsername || routeUserId)) {
    return (
      <SocialLayout hideRightSidebar>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-bold">User Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">This account doesn't exist or has been removed.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </SocialLayout>
    );
  }

  const content = (
    <div className="pb-28 md:pb-8">
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

      <div className="max-w-xl mx-auto relative z-0">
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
              <button className="text-center" onClick={() => navigate(`/app/social/profile/${targetUserId}/followers`)}>
                <p className="text-lg font-bold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </button>
              <button className="text-center" onClick={() => navigate(`/app/social/profile/${targetUserId}/followers?tab=following`)}>
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
                  navigator.clipboard.writeText(`${window.location.origin}/app/social/profile/${targetUserId}`);
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
                  onClick={() => handleToggleFollow()}
                >
                  {isFollowing ? <span className="flex items-center gap-1">Following <ChevronDown className="h-3 w-3" /></span> : "Follow"}
                </Button>
                {isMutualFollow && (
                  <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => navigate(`/app/social/messages/${targetUserId}`)}>
                    Message
                  </Button>
                )}
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
        {displayPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {displayPosts.map((post: any) => {
              const media = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;
              const isVideo = media?.type === 'video';
              const thumbSrc = isVideo ? (media?.thumbnailUrl || media?.url) : (media?.url || '');
              return (
                <button key={post.id} className="aspect-square bg-muted relative overflow-hidden group" onClick={() => navigate(`/app/social/user/${targetUserId}/posts/${post.id}`)}>
                  {thumbSrc ? (
                    isVideo ? (
                      <>
                        <img src={media?.thumbnailUrl || ''} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={thumbSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )
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
