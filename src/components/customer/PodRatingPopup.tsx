import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, Package, Store, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PodRatingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  customerId: string;
  customerName: string;
  supabaseUid: string;
  onComplete: () => void;
}

type Step = "pod" | "product_review" | "seller_rating" | "done";

export function PodRatingPopup({ open, onOpenChange, order, customerId, customerName, supabaseUid, onComplete }: PodRatingPopupProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("pod");
  const [podConfirmed, setPodConfirmed] = useState<boolean | null>(null);
  const [podForm, setPodForm] = useState({ confirmation_type: "received_in_person", recipient_name: "", notes: "" });

  // Product review state - one per product
  const items: any[] = order?.items || [];
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [productComment, setProductComment] = useState("");

  // Seller rating state
  const [sellerRating, setSellerRating] = useState(0);
  const [sellerComment, setSellerComment] = useState("");

  const submitPod = useMutation({
    mutationFn: async () => {
      // Save to delivery_proofs
      const { error } = await supabase.from("delivery_proofs" as any).insert({
        order_id: order.id,
        customer_id: customerId,
        confirmation_type: podForm.confirmation_type,
        recipient_name: podForm.recipient_name || null,
        notes: podForm.notes || null,
      });
      if (error) throw error;
      // Also update pod_confirmed on the order
      await supabase.from("orders").update({
        pod_confirmed: podConfirmed,
        pod_confirmed_at: new Date().toISOString(),
      } as any).eq("id", order.id);
    },
    onSuccess: () => {
      toast.success("Delivery confirmed!");
      qc.invalidateQueries({ queryKey: ["deliveryProof", order.id] });
      qc.invalidateQueries({ queryKey: ["orderDetail", order.id] });
      if (podConfirmed && items.length > 0) {
        setStep("product_review");
        setCurrentItemIdx(0);
        setProductRating(0);
        setProductComment("");
      } else {
        finishFlow();
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit"),
  });

  const submitProductReview = useMutation({
    mutationFn: async () => {
      const item = items[currentItemIdx];
      if (!productRating || !item?.id) return;
      await supabase.from("reviews").insert({
        user_id: supabaseUid,
        user_name: customerName,
        entity_type: "product",
        entity_id: item.id,
        rating: productRating,
        comment: productComment.trim() || null,
        order_id: order.id,
        status: "active",
      } as any);
    },
    onSuccess: () => {
      toast.success("Product review submitted! ⭐");
      moveToNextItem();
    },
    onError: (err: any) => {
      if (err.message?.includes("idx_reviews_unique_user_entity")) {
        toast.info("You already reviewed this product");
        moveToNextItem();
      } else {
        toast.error(err.message || "Failed");
      }
    },
  });

  const submitSellerRating = useMutation({
    mutationFn: async () => {
      if (!sellerRating) return;
      // Save seller rating as a review with entity_type 'vendor'
      await supabase.from("reviews").insert({
        user_id: supabaseUid,
        user_name: customerName,
        entity_type: "vendor",
        entity_id: order.vendor_id,
        rating: sellerRating,
        comment: sellerComment.trim() || null,
        order_id: order.id,
        status: "active",
      } as any);
      // Also update the delivery_rating on the order
      await supabase.from("orders").update({
        delivery_rating: sellerRating,
        rating_comment: sellerComment.trim() || null,
        rated_at: new Date().toISOString(),
      } as any).eq("id", order.id);
    },
    onSuccess: () => {
      toast.success("Seller rated! Thank you 🙏");
      qc.invalidateQueries({ queryKey: ["orderDetail", order.id] });
      finishFlow();
    },
    onError: (err: any) => {
      if (err.message?.includes("idx_reviews_unique_user_entity")) {
        toast.info("You already rated this seller");
      }
      finishFlow();
    },
  });

  const moveToNextItem = () => {
    if (currentItemIdx < items.length - 1) {
      setCurrentItemIdx(i => i + 1);
      setProductRating(0);
      setProductComment("");
    } else {
      setStep("seller_rating");
      setSellerRating(0);
      setSellerComment("");
    }
  };

  const finishFlow = () => {
    setStep("done");
    setTimeout(() => {
      onOpenChange(false);
      setStep("pod");
      onComplete();
    }, 1500);
  };

  const currentItem = items[currentItemIdx];
  const isPending = submitPod.isPending || submitProductReview.isPending || submitSellerRating.isPending;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      // Only allow closing after POD is submitted
      if (!o && step === "pod") return;
      if (!o) { onOpenChange(false); onComplete(); }
    }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => { if (step === "pod") e.preventDefault(); }}>
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-1">
          {["pod", "product_review", "seller_rating"].map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? 'bg-primary' : 
              (step === "done" || (s === "pod" && step !== "pod") || (s === "product_review" && step === "seller_rating")) ? 'bg-success' : 'bg-secondary'
            }`} />
          ))}
        </div>

        {/* Step 1: POD Confirmation */}
        {step === "pod" && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Have you received your order?
            </DialogTitle>
            <DialogDescription>Please confirm delivery to proceed.</DialogDescription>

            <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold">{order.id}</p>
              {items.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-secondary rounded flex items-center justify-center text-sm shrink-0 overflow-hidden">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>{item.emoji || "📦"}</span>}
                  </div>
                  <p className="text-xs truncate flex-1">{item.title}</p>
                  <p className="text-xs font-medium">×{item.qty}</p>
                </div>
              ))}
              {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} more</p>}
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 h-12"
                variant={podConfirmed === true ? "default" : "outline"}
                onClick={() => setPodConfirmed(true)}
              >
                ✅ Yes, Received
              </Button>
              <Button
                className="flex-1 h-12"
                variant={podConfirmed === false ? "destructive" : "outline"}
                onClick={() => setPodConfirmed(false)}
              >
                ❌ No, Not Received
              </Button>
            </div>

            {podConfirmed === true && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">How was it delivered?</Label>
                  <Select value={podForm.confirmation_type} onValueChange={v => setPodForm(f => ({ ...f, confirmation_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received_in_person">Received in person</SelectItem>
                      <SelectItem value="left_at_door">Left at door</SelectItem>
                      <SelectItem value="received_by_other">Received by someone else</SelectItem>
                      <SelectItem value="collected_from_store">Collected from store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {podForm.confirmation_type === "received_by_other" && (
                  <div>
                    <Label className="text-xs">Recipient Name</Label>
                    <Input value={podForm.recipient_name} onChange={e => setPodForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Who received it?" className="mt-1" />
                  </div>
                )}
              </div>
            )}

            {podConfirmed === false && (
              <div>
                <Label className="text-xs">Tell us what happened</Label>
                <Textarea value={podForm.notes} onChange={e => setPodForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe the issue..." className="mt-1" rows={2} />
              </div>
            )}

            {podConfirmed !== null && (
              <Button className="w-full" onClick={() => submitPod.mutate()} disabled={isPending}>
                {isPending ? "Submitting..." : "Submit & Continue"}
              </Button>
            )}
          </>
        )}

        {/* Step 2: Product Reviews (per item) */}
        {step === "product_review" && currentItem && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Rate Product ({currentItemIdx + 1}/{items.length})
            </DialogTitle>
            <DialogDescription>How was this product? (You can skip)</DialogDescription>

            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {currentItem.image ? <img src={currentItem.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{currentItem.emoji || "📦"}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentItem.title}</p>
                <p className="text-xs text-muted-foreground">Qty: {currentItem.qty}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Your Rating</p>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setProductRating(s)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${s <= productRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>

            {productRating > 0 && (
              <Textarea
                placeholder="Tell us about this product (optional)"
                value={productComment}
                onChange={e => setProductComment(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => moveToNextItem()} disabled={isPending}>
                <SkipForward className="h-4 w-4 mr-1" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => submitProductReview.mutate()} disabled={!productRating || isPending}>
                {isPending ? "..." : "Submit"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Seller Rating */}
        {step === "seller_rating" && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Rate the Seller
            </DialogTitle>
            <DialogDescription>How was your experience with {order.vendor_name || 'the seller'}? (You can skip)</DialogDescription>

            <div className="p-3 bg-secondary/30 rounded-lg flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{order.vendor_name || 'Seller'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Your Rating</p>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setSellerRating(s)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${s <= sellerRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>

            {sellerRating > 0 && (
              <Textarea
                placeholder="Share your experience with this seller (optional)"
                value={sellerComment}
                onChange={e => setSellerComment(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => finishFlow()} disabled={isPending}>
                <SkipForward className="h-4 w-4 mr-1" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => submitSellerRating.mutate()} disabled={!sellerRating || isPending}>
                {isPending ? "..." : "Submit Rating"}
              </Button>
            </div>
          </>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center py-6 space-y-2">
            <div className="text-4xl">🎉</div>
            <p className="text-sm font-semibold">Thank you for your feedback!</p>
            <p className="text-xs text-muted-foreground">Your reviews help other customers make better choices.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
