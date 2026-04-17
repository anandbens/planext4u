import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Star, ThumbsUp, MessageSquareReply } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  customer_id: string;
  food_rating: number | null;
  restaurant_rating: number | null;
  rider_rating: number | null;
  comment: string | null;
  photos: string[];
  tags: string[];
  helpful_count: number;
  restaurant_reply: string | null;
  restaurant_reply_at: string | null;
  created_at: string;
  edited_at: string | null;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export function RestaurantReviewsList({ restaurantId, max = 10 }: { restaurantId: string; max?: number }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("food_reviews")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(max);
      if (!live) return;
      setReviews((data || []) as any);
      if (user?.id && data?.length) {
        const ids = (data as any[]).map(r => r.id);
        const { data: my } = await supabase.from("food_review_helpful")
          .select("review_id").in("review_id", ids).eq("customer_id", user.id);
        if (live && my) setVoted(new Set(my.map((m: any) => m.review_id)));
      }
      setLoading(false);
    })();
    return () => { live = false; };
  }, [restaurantId, max, user?.id]);

  const toggleHelpful = async (reviewId: string) => {
    if (!user?.id) { toast.error("Sign in to vote"); return; }
    const wasVoted = voted.has(reviewId);
    setVoted(s => { const n = new Set(s); wasVoted ? n.delete(reviewId) : n.add(reviewId); return n; });
    setReviews(rs => rs.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + (wasVoted ? -1 : 1) } : r));
    const { data, error } = await supabase.rpc("toggle_food_review_helpful" as any, { _review_id: reviewId });
    if (error) {
      // revert
      setVoted(s => { const n = new Set(s); wasVoted ? n.add(reviewId) : n.delete(reviewId); return n; });
      setReviews(rs => rs.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + (wasVoted ? 1 : -1) } : r));
      toast.error("Could not record vote");
    }
  };

  if (loading) return <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  if (reviews.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">No reviews yet — be the first!</p>;

  return (
    <div className="space-y-2">
      {reviews.map(r => (
        <Card key={r.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stars n={r.restaurant_rating || r.food_rating || 0} />
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {r.edited_at && " · edited"}
              </span>
            </div>
          </div>
          {r.comment && <p className="text-sm leading-snug">{r.comment}</p>}
          {r.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted/60 rounded">{t}</span>)}
            </div>
          )}
          {r.photos?.length > 0 && (
            <div className="flex gap-1.5">
              {r.photos.map(url => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="h-14 w-14 rounded-md object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          {r.restaurant_reply && (
            <div className="bg-primary/5 border-l-2 border-primary/40 px-2.5 py-1.5 rounded">
              <p className="text-[10px] font-semibold text-primary flex items-center gap-1 mb-0.5">
                <MessageSquareReply className="h-3 w-3" /> Restaurant reply
              </p>
              <p className="text-xs leading-snug">{r.restaurant_reply}</p>
            </div>
          )}
          <button onClick={() => toggleHelpful(r.id)}
            className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-full border transition ${voted.has(r.id) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            <ThumbsUp className="h-3 w-3" /> Helpful {r.helpful_count > 0 && `(${r.helpful_count})`}
          </button>
        </Card>
      ))}
    </div>
  );
}
