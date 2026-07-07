import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, Wrench, Store, SkipForward, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServicePodPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  service: any;
  customerId: string;
  customerName: string;
  supabaseUid: string;
  onComplete: () => void;
}

type Step = "confirm" | "service_rating" | "seller_rating" | "done";

export function ServicePodPopup({ open, onOpenChange, booking, service, customerId, customerName, supabaseUid, onComplete }: ServicePodPopupProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("confirm");
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // Service rating
  const [serviceRating, setServiceRating] = useState(0);
  const [serviceComment, setServiceComment] = useState("");

  // Seller rating
  const [sellerRating, setSellerRating] = useState(0);
  const [sellerComment, setSellerComment] = useState("");

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const submitConfirmation = useMutation({
    mutationFn: async () => {
      let photoUrl = null;
      if (photo) {
        const ext = photo.name.split('.').pop() || 'jpg';
        try {
          const { uploadToB2 } = await import("@/lib/b2-upload");
          const { publicUrl } = await uploadToB2(photo, {
            folder: `vendor-assets/service-pod`,
            filename: `${booking.id}_customer.${ext}`,
            contentType: photo.type,
          });
          photoUrl = publicUrl;
        } catch (e) {
          console.warn('Service POD photo upload failed', e);
        }
      }

      await supabase.from("service_bookings").update({
        customer_pod_confirmed: confirmed,
        customer_pod_confirmed_at: new Date().toISOString(),
        customer_pod_photo_url: photoUrl,
      } as any).eq("id", booking.id);
    },
    onSuccess: () => {
      toast.success(confirmed ? "Service confirmed!" : "Issue reported");
      if (confirmed) {
        setStep("service_rating");
        setServiceRating(0);
        setServiceComment("");
      } else {
        finishFlow();
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed"),
  });

  const submitServiceReview = useMutation({
    mutationFn: async () => {
      if (!serviceRating) return;
      await supabase.from("reviews").insert({
        user_id: supabaseUid,
        user_name: customerName,
        entity_type: "service",
        entity_id: booking.service_id,
        rating: serviceRating,
        comment: serviceComment.trim() || null,
        booking_id: booking.id,
        status: "active",
      } as any);

      // Also update customer_rating on the booking
      await supabase.from("service_bookings").update({
        customer_rating: serviceRating,
        customer_rating_comment: serviceComment.trim() || null,
        rated_at: new Date().toISOString(),
      } as any).eq("id", booking.id);
    },
    onSuccess: () => {
      toast.success("Service rated! ⭐");
      setStep("seller_rating");
      setSellerRating(0);
      setSellerComment("");
    },
    onError: (err: any) => {
      if (err.message?.includes("idx_reviews_unique_user_entity")) {
        toast.info("Already reviewed");
      }
      setStep("seller_rating");
    },
  });

  const submitSellerReview = useMutation({
    mutationFn: async () => {
      if (!sellerRating) return;
      await supabase.from("reviews").insert({
        user_id: supabaseUid,
        user_name: customerName,
        entity_type: "vendor",
        entity_id: booking.vendor_id,
        rating: sellerRating,
        comment: sellerComment.trim() || null,
        booking_id: booking.id,
        status: "active",
      } as any);
    },
    onSuccess: () => {
      toast.success("Seller rated! 🙏");
      finishFlow();
    },
    onError: (err: any) => {
      if (err.message?.includes("idx_reviews_unique_user_entity")) toast.info("Already rated");
      finishFlow();
    },
  });

  const finishFlow = () => {
    setStep("done");
    setTimeout(() => {
      onOpenChange(false);
      setStep("confirm");
      onComplete();
    }, 1500);
  };

  const isPending = submitConfirmation.isPending || submitServiceReview.isPending || submitSellerReview.isPending;

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o && step === "confirm") return;
      if (!o) { onOpenChange(false); onComplete(); }
    }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => { if (step === "confirm") e.preventDefault(); }}>
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-1">
          {["confirm", "service_rating", "seller_rating"].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? 'bg-primary' :
              (step === "done" || (s === "confirm" && step !== "confirm") || (s === "service_rating" && step === "seller_rating")) ? 'bg-success' : 'bg-secondary'
            }`} />
          ))}
        </div>

        {/* Step 1: Confirm service completion */}
        {step === "confirm" && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Confirm Service Completion
            </DialogTitle>
            <DialogDescription>Was the service completed to your satisfaction?</DialogDescription>

            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-sm font-semibold">{service?.title || 'Service'}</p>
              <p className="text-xs text-muted-foreground">{new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {booking.start_time}</p>
            </div>

            {booking.completion_photo_url && (
              <div className="p-2 bg-info/5 rounded-lg">
                <p className="text-xs font-medium mb-1">Vendor's completion photo:</p>
                <img loading="lazy" decoding="async" src={booking.completion_photo_url} alt="Completion" className="max-h-32 rounded object-cover" />
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1 h-12" variant={confirmed === true ? "default" : "outline"} onClick={() => setConfirmed(true)}>
                ✅ Yes, Done
              </Button>
              <Button className="flex-1 h-12" variant={confirmed === false ? "destructive" : "outline"} onClick={() => setConfirmed(false)}>
                ❌ No, Issue
              </Button>
            </div>

            {confirmed !== null && (
              <>
                <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
                  {photoPreview ? (
                    <div>
                      <img loading="lazy" decoding="async" src={photoPreview} alt="Preview" className="max-h-24 mx-auto rounded" />
                      <Button variant="outline" size="sm" className="mt-1 text-xs" onClick={() => { setPhoto(null); setPhotoPreview(""); }}>Change</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Attach photo (optional)</p>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                    </label>
                  )}
                </div>

                <Button className="w-full" onClick={() => submitConfirmation.mutate()} disabled={isPending}>
                  {isPending ? "Submitting..." : "Submit & Continue"}
                </Button>
              </>
            )}
          </>
        )}

        {/* Step 2: Service Rating */}
        {step === "service_rating" && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" /> Rate the Service
            </DialogTitle>
            <DialogDescription>How was the service? (You can skip)</DialogDescription>

            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setServiceRating(s)} className="transition-transform hover:scale-110">
                  <Star className={`h-8 w-8 ${s <= serviceRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>

            {serviceRating > 0 && (
              <Textarea placeholder="Tell us about the service (optional)" value={serviceComment} onChange={e => setServiceComment(e.target.value)} className="min-h-[60px] text-sm" />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("seller_rating"); setSellerRating(0); setSellerComment(""); }} disabled={isPending}>
                <SkipForward className="h-4 w-4 mr-1" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => submitServiceReview.mutate()} disabled={!serviceRating || isPending}>
                {isPending ? "..." : "Submit"}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Seller Rating */}
        {step === "seller_rating" && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Rate the Service Provider
            </DialogTitle>
            <DialogDescription>How was your experience with the provider? (You can skip)</DialogDescription>

            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setSellerRating(s)} className="transition-transform hover:scale-110">
                  <Star className={`h-8 w-8 ${s <= sellerRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>

            {sellerRating > 0 && (
              <Textarea placeholder="Share your experience (optional)" value={sellerComment} onChange={e => setSellerComment(e.target.value)} className="min-h-[60px] text-sm" />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => finishFlow()} disabled={isPending}>
                <SkipForward className="h-4 w-4 mr-1" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => submitSellerReview.mutate()} disabled={!sellerRating || isPending}>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
