import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function SocialSuggestionsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.supabase_uid || customerUser?.id;
  const [page, setPage] = useState(0);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["social-all-suggestions", userId, page],
    queryFn: async () => {
      if (!userId) return { items: [], total: 0 };
      const followingIds: string[] = [userId];
      const { data: follows } = await supabase.from("social_follows").select("following_id").eq("follower_id", userId).eq("status", "active");
      if (follows) followingIds.push(...follows.map((f: any) => f.following_id));

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: profiles, count } = await supabase
        .from("social_profiles")
        .select("id, user_id, username, display_name, avatar_url, is_verified", { count: "exact" })
        .not("user_id", "in", `(${followingIds.join(",")})`)
        .range(from, to);
      return { items: profiles || [], total: count || 0 };
    },
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      if (!userId) throw new Error("Not logged in");
      await supabase.from("social_follows").insert({ follower_id: userId, following_id: targetId, status: "active" });
    },
    onSuccess: (_, targetId) => {
      setFollowedIds((prev) => new Set([...prev, targetId]));
      qc.invalidateQueries({ queryKey: ["social-all-suggestions"] });
      qc.invalidateQueries({ queryKey: ["social-suggestions"] });
      toast.success("Following!");
    },
    onError: () => toast.error("Failed to follow"),
  });

  const items = (data?.items || []).filter((u: any) => !followedIds.has(u.user_id));
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <SocialLayout hideRightSidebar>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Suggested for You</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No more suggestions</p>
        ) : (
          <div className="space-y-1">
            {items.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition">
                <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/app/social/profile/${u.user_id}`)}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> :
                    <AvatarFallback className="bg-muted font-bold">{u.username?.charAt(0).toUpperCase()}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/app/social/profile/${u.user_id}`)}>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm">{u.username}</span>
                    {u.is_verified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.display_name || "Suggested for you"}</p>
                </div>
                <Button size="sm" className="rounded-full h-8 px-4 text-xs" onClick={() => followMutation.mutate(u.user_id)} disabled={followMutation.isPending}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />Follow
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </SocialLayout>
  );
}
