import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { findFriends, getFriendsOfFriends } from "@/lib/device-service";
import { toast } from "sonner";
import { isNativePlatform } from "@/lib/capacitor";

interface Suggestion {
  id: string;
  name: string;
  profile_photo: string | null;
  source: "contacts" | "friends_of_friends" | "discover";
  mutual_count?: number;
}

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

  const { data: suggestions = [], isLoading } = useQuery<Suggestion[]>({
    queryKey: ["people-you-may-know", userId, contactsRequested],
    queryFn: async () => {
      if (!userId) return [];

      const merged: Suggestion[] = [];
      const seenIds = new Set<string>([userId]);

      // Pre-load IDs the current user already follows so we never suggest them again
      const { data: existingFollows } = await supabase
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", userId)
        .eq("status", "active");
      for (const f of existingFollows || []) {
        seenIds.add((f as any).following_id);
      }

      // 1. Friends of friends (always available, no permission required)
      const fof = await getFriendsOfFriends(userId, 10);
      for (const f of fof) {
        if (seenIds.has(f.user_id)) continue;
        seenIds.add(f.user_id);
        merged.push({
          id: f.user_id,
          name: f.display_name || f.username || "User",
          profile_photo: f.avatar_url,
          source: "friends_of_friends",
          mutual_count: f.mutual_count,
        });
      }

      // 2. Phone contact matches (only if user opted in on native)
      if (isNativePlatform() && contactsRequested) {
        const matched = await findFriends();
        for (const m of matched) {
          if (seenIds.has(m.id)) continue;
          const { data: profile } = await supabase
            .from("social_profiles")
            .select("user_id, display_name, username, avatar_url")
            .eq("user_id", m.id)
            .maybeSingle();
          if (!profile) continue;
          if (seenIds.has(profile.user_id)) continue;
          seenIds.add(profile.user_id);
          merged.push({
            id: profile.user_id,
            name: profile.display_name || profile.username || m.name || "User",
            profile_photo: profile.avatar_url || m.profile_photo,
            source: "contacts",
          });
        }
      }

      // 3. Fallback: discover new profiles if list is short — excludes already-followed users
      if (merged.length < 6) {
        const excludeIds = Array.from(seenIds);
        const excludeList = excludeIds.length > 0
          ? `(${excludeIds.map((id) => `"${id}"`).join(",")})`
          : '("00000000-0000-0000-0000-000000000000")';
        const { data: profiles } = await supabase
          .from("social_profiles")
          .select("user_id, display_name, username, avatar_url")
          .not("user_id", "in", excludeList)
          .limit(10 - merged.length);

        for (const p of profiles || []) {
          if (seenIds.has(p.user_id)) continue;
          seenIds.add(p.user_id);
          merged.push({
            id: p.user_id,
            name: p.display_name || p.username || "User",
            profile_photo: p.avatar_url,
            source: "discover",
          });
        }
      }

      return merged.slice(0, 12);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
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
    onSuccess: () => {
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
            <div key={i} className="flex flex-col items-center gap-2 min-w-[120px]">
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
            className="flex flex-col items-center gap-1.5 min-w-[120px] shrink-0 bg-card border border-border/30 rounded-xl p-3"
          >
            <Link to={`/app/social/profile/${user.id}`}>
              <div className="h-16 w-16 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
                {user.profile_photo ? (
                  <img loading="lazy" decoding="async"
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
            </Link>
            <Link to={`/app/social/profile/${user.id}`} className="text-xs font-medium text-center truncate w-full px-1">
              {user.name}
            </Link>
            {user.source === "friends_of_friends" && user.mutual_count ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                {user.mutual_count} mutual
              </p>
            ) : user.source === "contacts" ? (
              <p className="text-[10px] text-muted-foreground">From contacts</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Suggested</p>
            )}
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs rounded-full px-4 w-full"
              onClick={() => handleFollow(user.id)}
              disabled={followMutation.isPending}
            >
              Follow
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
