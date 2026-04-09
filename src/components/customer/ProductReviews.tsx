import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const PAGE_SIZE = 10;
type SortOption = "recent" | "highest" | "lowest";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ProductReviewsProps {
  productId: string;
  entityType?: string;
}

export default function ProductReviews({ productId, entityType = "product" }: ProductReviewsProps) {
  const { customerUser, supabaseUser } = useAuth();
  const qc = useQueryClient();
  const [sort, setSort] = useState<SortOption>("recent");
  const [page, setPage] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const userId = supabaseUser?.id;
  const customerId = customerUser?.id;

  // Check if user has purchased this product (completed/delivered orders)
  const { data: purchasedOrders } = useQuery({
    queryKey: ["user-purchased-orders", customerId, productId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, items")
        .eq("customer_id", customerId)
        .in("status", ["delivered", "completed"]);
      // Filter orders containing this product
      return (data || []).filter((order: any) => {
        const items = order.items || [];
        return items.some((item: any) => item.id === productId);
      });
    },
    enabled: !!customerId,
  });

  // Check if user already reviewed this product
  const { data: existingReview } = useQuery({
    queryKey: ["user-review", userId, productId, entityType],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId)
        .eq("entity_type", entityType)
        .eq("entity_id", productId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch rating summary
  const { data: summary } = useQuery({
    queryKey: ["review-summary", productId, entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("entity_type", entityType)
        .eq("entity_id", productId)
        .eq("status", "active");
      if (error) throw error;
      const ratings = (data || []).map((r: any) => r.rating as number);
      const total = ratings.length;
      const avg = total > 0 ? ratings.reduce((a, b) => a + b, 0) / total : 0;
      const dist = [0, 0, 0, 0, 0];
      ratings.forEach(r => { if (r >= 1 && r <= 5) dist[r - 1]++; });
      return { avg: Math.round(avg * 10) / 10, total, distribution: dist };
    },
  });

  // Fetch paginated reviews
  const orderCol = sort === "recent" ? "created_at" : "rating";
  const orderAsc = sort === "lowest";

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["reviews", productId, entityType, sort, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", productId)
        .eq("status", "active")
        .order(orderCol, { ascending: orderAsc })
        .range(from, to);
      if (error) throw error;
      return data || [];
    },
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!userId || !customerId) throw new Error("Please login to submit a review");
      if (!newRating) throw new Error("Please select a rating");

      const { error } = await supabase.from("reviews").insert({
        user_id: userId,
        user_name: customerUser?.name || "Customer",
        entity_type: entityType,
        entity_id: productId,
        rating: newRating,
        comment: newComment.trim() || null,
        order_id: selectedOrderId || null,
        status: "active",
      } as any);

      if (error) {
        if (error.message?.includes("idx_reviews_unique_user_entity")) {
          throw new Error("You have already reviewed this product.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Review submitted successfully! ⭐");
      setNewRating(0);
      setNewComment("");
      setSelectedOrderId("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["review-summary", productId] });
      qc.invalidateQueries({ queryKey: ["user-review", userId, productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit review"),
  });

  const reviews = reviewsData || [];
  const totalReviews = summary?.total || 0;
  const totalPages = Math.ceil(totalReviews / PAGE_SIZE);
  const hasPurchased = (purchasedOrders || []).length > 0;
  const canReview = !!userId && hasPurchased && !existingReview;

  return (
    <div className="space-y-4">
      {/* Review Submission Form */}
      {canReview && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <h4 className="text-sm font-semibold mb-3">Write a Review</h4>
          <div className="space-y-3">
            {/* Star selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Your Rating *</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setNewRating(s)} className="transition-transform hover:scale-110">
                    <Star className={`h-7 w-7 ${s <= newRating ? 'fill-warning text-warning' : 'text-muted-foreground/30 hover:text-warning/50'}`} />
                  </button>
                ))}
              </div>
              {newRating > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {newRating <= 2 ? "We're sorry to hear that. Tell us what went wrong." : newRating <= 3 ? "Thanks! How can we improve?" : "Great to hear! 🎉"}
                </p>
              )}
            </div>

            {/* Order selector */}
            {purchasedOrders && purchasedOrders.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">For Order (optional)</p>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedOrders.map((o: any) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.id} — {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Comment */}
            <Textarea
              placeholder="Share your experience with this product (optional)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[70px] text-sm"
            />

            <Button
              onClick={() => submitReview.mutate()}
              disabled={!newRating || submitReview.isPending}
              className="w-full sm:w-auto"
            >
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </Card>
      )}

      {/* Already reviewed badge */}
      {existingReview && (
        <Card className="p-3 flex items-center gap-2 bg-success/5 border-success/20">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < existingReview.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">You reviewed this product</span>
        </Card>
      )}

      {/* Not purchased message */}
      {userId && !hasPurchased && !existingReview && (
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Purchase this product to leave a review.</p>
        </Card>
      )}

      {/* Rating Summary */}
      {summary && summary.total > 0 && (
        <Card className="p-4">
          <div className="flex items-start gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{summary.avg}</p>
              <div className="flex gap-0.5 mt-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(summary.avg) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.total} review{summary.total !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = summary.distribution[star - 1];
                const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right">{star}</span>
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-muted-foreground text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Sort & Filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {totalReviews > 0 ? `${totalReviews} Review${totalReviews !== 1 ? 's' : ''}` : 'No reviews yet'}
        </p>
        {totalReviews > 0 && (
          <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : totalReviews === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product!</p>
        </Card>
      ) : (
        reviews.map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{r.user_name || 'Customer'}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`h-3 w-3 ${j < r.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                {r.order_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Verified Purchase</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
            </div>
            {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
          </Card>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
