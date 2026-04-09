import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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
  const [sort, setSort] = useState<SortOption>("recent");
  const [page, setPage] = useState(0);

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
      const q = supabase
        .from("reviews")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", productId)
        .eq("status", "active")
        .order(orderCol, { ascending: orderAsc })
        .range(from, to);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const reviews = reviewsData || [];
  const totalReviews = summary?.total || 0;
  const totalPages = Math.ceil(totalReviews / PAGE_SIZE);

  return (
    <div className="space-y-4">
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
