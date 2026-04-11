import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function SocialFriendsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const userId = customerUser?.supabase_uid || customerUser?.id;
  const [searchQuery, setSearchQuery] = useState("");

  // Get mutual followers (friends) – users who follow me AND I follow them
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["social-friends", userId],
    queryFn: async () => {
      if (!userId) return [];
      // Get users I follow
      const { data: iFollow } = await supabase.from("social_follows").select("following_id").eq("follower_id", userId).eq("status", "active");
      if (!iFollow || iFollow.length === 0) return [];
      const iFollowIds = iFollow.map((f: any) => f.following_id);

      // Get users who follow me back from those I follow
      const { data: theyFollowMe } = await supabase.from("social_follows").select("follower_id").eq("following_id", userId).eq("status", "active").in("follower_id", iFollowIds);
      if (!theyFollowMe || theyFollowMe.length === 0) return [];
      const mutualIds = theyFollowMe.map((f: any) => f.follower_id);

      // Get profiles
      const { data: profiles } = await supabase.from("social_profiles").select("id, user_id, username, display_name, avatar_url, is_verified").in("user_id", mutualIds);
      return profiles || [];
    },
    enabled: !!userId,
  });

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f: any) =>
      f.username?.toLowerCase().includes(q) || f.display_name?.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleMessage = (friendUserId: string) => {
    navigate(`/app/social/messages/${friendUserId}`);
  };

  return (
    <SocialLayout hideRightSidebar>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Your Friends</h1>
          <span className="text-sm text-muted-foreground">({friends.length})</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends by name..."
            className="pl-9 pr-9 h-10 bg-muted/50 border-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            {searchQuery ? "No friends match your search" : "No mutual friends yet. Follow people and once they follow you back, they'll appear here!"}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((friend: any) => (
              <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition">
                <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/app/social/profile/${friend.user_id}`)}>
                  {friend.avatar_url ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> :
                    <AvatarFallback className="bg-muted font-bold">{friend.username?.charAt(0).toUpperCase()}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/social/profile/${friend.user_id}`)}>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm">{friend.display_name || friend.username}</span>
                    {friend.is_verified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                </div>
                <button
                  className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition"
                  onClick={() => handleMessage(friend.user_id)}
                  title="Send message"
                >
                  <MessageCircle className="h-4.5 w-4.5 text-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SocialLayout>
  );
}
