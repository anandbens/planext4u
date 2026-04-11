import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FollowUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  isFollowing: boolean;
}

export default function SocialFollowersPage() {
  const navigate = useNavigate();
  const { username, userId: routeUserId, tab } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const { customerUser } = useAuth();
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    searchParams.get('tab') === 'following' || tab === 'following' ? 'following' : 'followers'
  );
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const profileUsername = username?.replace('@', '');

  // Get the profile user_id from username or use routeUserId directly
  const { data: profileUser } = useQuery({
    queryKey: ['social-profile-by-username', profileUsername, routeUserId],
    queryFn: async () => {
      if (routeUserId) {
        return { user_id: routeUserId };
      }
      if (!profileUsername && currentUserId) {
        const { data } = await supabase.from('social_profiles').select('user_id').eq('user_id', currentUserId).maybeSingle();
        return data;
      }
      const { data } = await supabase.from('social_profiles').select('user_id').eq('username', profileUsername).maybeSingle();
      return data;
    },
    enabled: !!profileUsername || !!currentUserId || !!routeUserId,
  });

  const targetUserId = profileUser?.user_id || '';

  // Fetch followers
  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['social-followers-list', targetUserId],
    queryFn: async () => {
      // Get all users who follow targetUserId
      const { data: followRows } = await supabase
        .from('social_follows')
        .select('follower_id')
        .eq('following_id', targetUserId)
        .eq('status', 'active');

      if (!followRows?.length) return [];

      const followerIds = followRows.map((f: any) => f.follower_id);

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url, is_verified')
        .in('user_id', followerIds);

      // Check which ones the current user follows
      let currentFollowingIds: string[] = [];
      if (currentUserId) {
        const { data: myFollows } = await supabase
          .from('social_follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .eq('status', 'active')
          .in('following_id', followerIds);
        currentFollowingIds = (myFollows || []).map((f: any) => f.following_id);
      }

      return (profiles || []).map((p: any): FollowUser => ({
        user_id: p.user_id,
        username: p.username || 'user',
        display_name: p.display_name || p.username || 'User',
        avatar_url: p.avatar_url,
        is_verified: p.is_verified || false,
        isFollowing: currentFollowingIds.includes(p.user_id),
      }));
    },
    enabled: !!targetUserId,
  });

  // Fetch following
  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['social-following-list', targetUserId],
    queryFn: async () => {
      const { data: followRows } = await supabase
        .from('social_follows')
        .select('following_id')
        .eq('follower_id', targetUserId)
        .eq('status', 'active');

      if (!followRows?.length) return [];

      const followingIds = followRows.map((f: any) => f.following_id);

      const { data: profiles } = await supabase
        .from('social_profiles')
        .select('user_id, username, display_name, avatar_url, is_verified')
        .in('user_id', followingIds);

      let currentFollowingIds: string[] = [];
      if (currentUserId) {
        const { data: myFollows } = await supabase
          .from('social_follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .eq('status', 'active')
          .in('following_id', followingIds);
        currentFollowingIds = (myFollows || []).map((f: any) => f.following_id);
      }

      return (profiles || []).map((p: any): FollowUser => ({
        user_id: p.user_id,
        username: p.username || 'user',
        display_name: p.display_name || p.username || 'User',
        avatar_url: p.avatar_url,
        is_verified: p.is_verified || false,
        isFollowing: currentFollowingIds.includes(p.user_id) || p.user_id === currentUserId,
      }));
    },
    enabled: !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async ({ targetId, unfollow }: { targetId: string; unfollow: boolean }) => {
      if (!currentUserId) throw new Error("Not logged in");
      if (unfollow) {
        await supabase.from('social_follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId);
      } else {
        const { error } = await supabase.from('social_follows').insert({ follower_id: currentUserId, following_id: targetId, status: 'active' });
        if (error && error.code !== '23505') throw error;
      }
    },
    onSuccess: (_, { unfollow }) => {
      toast.success(unfollow ? "Unfollowed" : "Following");
      qc.invalidateQueries({ queryKey: ['social-followers-list'] });
      qc.invalidateQueries({ queryKey: ['social-following-list'] });
      qc.invalidateQueries({ queryKey: ['social-follower-count'] });
      qc.invalidateQueries({ queryKey: ['social-following-count'] });
    },
    onError: () => toast.error("Action failed"),
  });

  const removeFollowerMutation = useMutation({
    mutationFn: async (followerId: string) => {
      if (!currentUserId) throw new Error("Not logged in");
      await supabase.from('social_follows').delete().eq('follower_id', followerId).eq('following_id', currentUserId);
    },
    onSuccess: () => {
      toast.success("Follower removed");
      qc.invalidateQueries({ queryKey: ['social-followers-list'] });
      qc.invalidateQueries({ queryKey: ['social-follower-count'] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const users = activeTab === 'followers' ? followers : following;
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.display_name.toLowerCase().includes(search.toLowerCase()));
  const isOwnProfile = targetUserId === currentUserId;

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">{profileUsername || "Profile"}</h1>
        </div>
        <div className="flex border-b border-border/20">
          <button onClick={() => setActiveTab('followers')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'followers' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>
            Followers
          </button>
          <button onClick={() => setActiveTab('following')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'following' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>
            Following
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search ? "No results found" : activeTab === 'followers' ? "No followers yet" : "Not following anyone yet"}
        </div>
      ) : (
        <div className="divide-y divide-border/10">
          {filtered.map(user => (
            <div key={user.user_id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/app/social/profile/${user.user_id}`)}>
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.username} />}
                <AvatarFallback className="bg-muted text-sm font-bold">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold truncate">{user.username}</span>
                  {user.is_verified && <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.display_name}</p>
              </div>
              {user.user_id !== currentUserId && (
                <Button
                  size="sm"
                  variant={user.isFollowing ? "secondary" : "default"}
                  className="h-8 px-4 text-xs font-semibold rounded-lg"
                  onClick={() => followMutation.mutate({ targetId: user.user_id, unfollow: user.isFollowing })}
                  disabled={followMutation.isPending}
                >
                  {user.isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              {activeTab === 'followers' && isOwnProfile && (
                <button onClick={() => removeFollowerMutation.mutate(user.user_id)} className="p-1"><X className="h-4 w-4 text-muted-foreground" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
