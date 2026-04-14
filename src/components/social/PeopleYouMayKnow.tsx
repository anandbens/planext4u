import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { findFriends, MatchedUser } from "@/lib/device-service";
import { toast } from "sonner";
import { isNativePlatform } from "@/lib/capacitor";

export default function PeopleYouMayKnow() {
  const { customerUser } = useAuth();
  const userId = customerUser?.supabase_uid || customerUser?.id;
  const qc = useQueryClient();
  const [contactsRequested, setContactsRequested] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncContacts = async () => {
    setSyncing(true);
    setContactsRequested(true);
    try {
      const matched = await findFriends();
      if (matched.length === 0) {
        toast.info("No matching contacts found. Invite your friends to join!");
      } else {
        toast.success(`Found ${matched.length} contact(s) on the platform!`);
      }
    } catch (err) {
      console.error("Sync contacts error:", err);
      toast.error("Could not sync contacts. Please check permissions and try again.");
    } finally {
      setSyncing(false);
      qc.invalidateQueries({ queryKey: ["people-you-may-know"] });
    }
  };

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["people-you-may-know", userId, contactsRequested],
    queryFn: async () => {
      if (!userId) return [];

      // On native, try contact matching
      if (isNativePlatform() && contactsRequested) {
        const matched = await findFriends();
        return matched.filter((u) => u.id !== userId);
      }

      // Fallback: suggest users the current user doesn't follow
      const { data: following } = await supabase
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = (following || []).map((f: any) => f.following_id);
      followingIds.push(userId); // exclude self

      const { data: profiles } = await supabase
        .from("social_profiles")
        .select("user_id, display_name, username, avatar_url")
        .not("user_id", "in", `(${followingIds.join(",")})`)
        .limit(10);

      return (profiles || []).map((p: any) => ({
        id: p.user_id,
        name: p.display_name || p.username || "User",
        mobile: "",
        profile_photo: p.avatar_url,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      if (!userId) throw new Error("Not logged in");
      const { error } = await supabase.from("social_follows").insert({
        follower_id: userId,
        following_id: targetId,
      });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: (_, targetId) => {
      qc.invalidateQueries({ queryKey: ["people-you-may-know"] });
      qc.invalidateQueries({ queryKey: ["social-followers"] });
      toast.success("Followed!");
    },
    onError: () => toast.error("Failed to follow"),
  });

  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const handleFollow = (targetId: string) => {
    setFollowedIds((prev) => new Set([...prev, targetId]));
    followMutation.mutate(targetId);
  };

  const visibleSuggestions = suggestions.filter((s) => !followedIds.has(s.id));

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <h3 className="font-semibold text-sm mb-3">People You May Know</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[100px]">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) {
    // On native, show "Find Friends" button if contacts not yet requested
    if (isNativePlatform() && !contactsRequested) {
      return (
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm mb-3">People You May Know</h3>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleSyncContacts}
            disabled={syncing}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {syncing ? "Syncing..." : "Find Friends from Contacts"}
          </Button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">People You May Know</h3>
        {isNativePlatform() && !contactsRequested && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={handleSyncContacts}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Contacts"}
          </Button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {visibleSuggestions.map((user) => (
          <div
            key={user.id}
            className="flex flex-col items-center gap-1.5 min-w-[100px] shrink-0"
          >
            <div className="h-16 w-16 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
              {user.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-center truncate w-full px-1">
              {user.name}
            </span>
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs rounded-full px-4"
              onClick={() => handleFollow(user.id)}
              disabled={followMutation.isPending}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Follow
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
