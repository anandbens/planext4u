import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface UnratedProduct {
  product_id: string;
  product_title: string;
  product_image: string;
  order_id: string;
}

interface Props {
  customerId: string;
  userId: string; // supabase auth uid
}

export function RatingPopup({ customerId, userId }: Props) {
  const [products, setProducts] = useState<UnratedProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!customerId || dismissed) return;

    // Check session storage to avoid showing again in same session
    const key = `rating_popup_shown_${customerId}`;
    if (sessionStorage.getItem(key)) return;

    const fetchUnrated = async () => {
      // Get delivered/completed orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, items")
        .eq("customer_id", customerId)
        .in("status", ["delivered", "completed"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (!orders?.length) return;

      // Collect product IDs from order items
      const productMap: Record<string, UnratedProduct> = {};
      for (const order of orders) {
        const items = (order.items as any[]) || [];
        for (const item of items) {
          const pid = item.product_id || item.id;
          if (pid && !productMap[pid]) {
            productMap[pid] = {
              product_id: pid,
              product_title: item.title || item.name || "Product",
              product_image: item.image || "",
              order_id: order.id,
            };
          }
        }
      }

      const productIds = Object.keys(productMap);
      if (!productIds.length) return;

      // Check which ones already have reviews
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("entity_id")
        .eq("user_id", userId)
        .eq("entity_type", "product")
        .eq("status", "active")
        .in("entity_id", productIds);

      const reviewedIds = new Set((existingReviews || []).map(r => r.entity_id));
      const unrated = productIds
        .filter(id => !reviewedIds.has(id))
        .map(id => productMap[id]);

      if (unrated.length > 0) {
        setProducts(unrated.slice(0, 5)); // max 5 products
        setOpen(true);
        sessionStorage.setItem(key, "1");
      }
    };

    // Small delay so home page loads first
    const timer = setTimeout(fetchUnrated, 2000);
    return () => clearTimeout(timer);
  }, [customerId, userId, dismissed]);

  const current = products[currentIndex];

  const handleSubmit = async () => {
    if (!rating || !current) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        user_id: userId,
        user_name: "",
        entity_type: "product",
        entity_id: current.product_id,
        rating,
        comment: "",
        order_id: current.order_id,
        status: "active",
      } as any);

      if (error && error.code !== "23505") throw error;

      toast.success("Thanks for your rating! ⭐");

      if (currentIndex < products.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRating(0);
        setHoveredStar(0);
      } else {
        setOpen(false);
      }
    } catch {
      toast.error("Failed to submit rating");
    }
    setSubmitting(false);
  };

  const handleSkip = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setRating(0);
      setHoveredStar(0);
    } else {
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Rate your purchase</DialogTitle>
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-6 pb-4 text-center relative">
          <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-background/50 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold">How was your purchase?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {currentIndex + 1} of {products.length} product{products.length > 1 ? "s" : ""} to rate
          </p>
        </div>

        {/* Product info */}
        <div className="px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.product_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="h-14 w-14 rounded-lg bg-secondary/30 overflow-hidden shrink-0 flex items-center justify-center">
                {current.product_image ? (
                  <img loading="lazy" decoding="async" src={current.product_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-2">{current.product_title}</p>
                <p className="text-[10px] text-muted-foreground">Order: {current.order_id}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Star rating */}
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                className="transition-transform hover:scale-110 active:scale-95"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "fill-warning text-warning"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mb-1">
            {rating === 0 ? "Tap a star to rate" : 
             rating === 1 ? "Poor" : 
             rating === 2 ? "Fair" : 
             rating === 3 ? "Good" : 
             rating === 4 ? "Very Good" : "Excellent!"}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="flex-1 text-muted-foreground">
            Skip
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 gap-1"
          >
            {submitting ? "Saving..." : "Submit"}
            {!submitting && <ChevronRight className="h-3 w-3" />}
          </Button>
        </div>

        {/* Progress dots */}
        {products.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-4">
            {products.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-primary" : i < currentIndex ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
