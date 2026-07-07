import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface MutualFollower {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  profileUserId: string;
}

/**
 * Instagram-style "Followed by alice, bob and 5 others" chip.
 * Only visible when viewing someone else's profile and there are mutual followers.
 * Tapping opens that user's followers list.
 */
export default function FollowedByChip({ profileUserId }: Props) {
  const { customerUser } = useAuth();
  const navigate = useNavigate();
  const viewerId = customerUser?.supabase_uid || customerUser?.id;

  const { data } = useQuery({
    queryKey: ["mutual-followers", viewerId, profileUserId],
    queryFn: async () => {
      if (!viewerId || !profileUserId || viewerId === profileUserId) return null;
      const [{ data: list }, { data: count }] = await Promise.all([
        supabase.rpc("get_mutual_followers", {
          _viewer: viewerId,
          _profile: profileUserId,
          _limit: 3,
        }),
        supabase.rpc("count_mutual_followers", {
          _viewer: viewerId,
          _profile: profileUserId,
        }),
      ]);
      return {
        list: (list || []) as MutualFollower[],
        total: (count as unknown as number) || 0,
      };
    },
    enabled: !!viewerId && !!profileUserId && viewerId !== profileUserId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.list.length === 0 || data.total === 0) return null;

  const shown = data.list.slice(0, 3);
  const remaining = Math.max(0, data.total - shown.length);

  const names = shown.map((u) => u.display_name || u.username);
  let label = "";
  if (names.length === 1 && remaining === 0) label = names[0];
  else if (names.length === 2 && remaining === 0) label = `${names[0]} and ${names[1]}`;
  else if (remaining > 0) label = `${names.join(", ")} and ${remaining} other${remaining > 1 ? "s" : ""}`;
  else label = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return (
    <button
      onClick={() => navigate(`/app/social/profile/${profileUserId}/followers`)}
      className="flex items-center gap-2 mt-2 px-1 py-1 -mx-1 rounded-md hover:bg-accent/50 transition-colors text-left w-full"
    >
      <div className="flex -space-x-2 shrink-0">
        {shown.map((u) => (
          <div
            key={u.user_id}
            className="h-5 w-5 rounded-full bg-muted border-2 border-card overflow-hidden flex items-center justify-center"
          >
            {u.avatar_url ? (
              <img loading="lazy" decoding="async" src={u.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[8px] font-bold text-muted-foreground">
                {(u.display_name || u.username).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-tight">
        Followed by <span className="font-semibold text-foreground">{label}</span>
      </p>
    </button>
  );
}
