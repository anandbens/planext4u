import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Camera, X, Bike, ChefHat, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { toast } from "sonner";

const FOOD_TAGS = ["Tasty Food", "Hot & Fresh", "Good Packaging", "Worth the price", "Cold Food", "Stale", "Bland", "Wrong Item"];
const RIDER_TAGS = ["Polite", "Fast Delivery", "On time", "Late", "Rude", "Unprofessional"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  customerId: string;
  restaurantId: string;
  riderId?: string | null;
  initial?: {
    food_rating?: number; restaurant_rating?: number; rider_rating?: number;
    comment?: string; photos?: string[]; tags?: string[]; rider_tags?: string[];
  } | null;
  onSubmitted?: () => void;
}

function StarPicker({ value, onChange, label, Icon }: { value: number; onChange: (n: number) => void; label: string; Icon: typeof Star }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} className="transition-transform hover:scale-110">
            <Star className={`h-7 w-7 ${n <= value ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FoodReviewModal(p: Props) {
  const [foodR, setFoodR] = useState(0);
  const [restR, setRestR] = useState(0);
  const [riderR, setRiderR] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [riderTags, setRiderTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (p.open) {
      setFoodR(p.initial?.food_rating ?? 0);
      setRestR(p.initial?.restaurant_rating ?? 0);
      setRiderR(p.initial?.rider_rating ?? 0);
      setComment(p.initial?.comment ?? "");
      setPhotos(p.initial?.photos ?? []);
      setTags(p.initial?.tags ?? []);
      setRiderTags(p.initial?.rider_tags ?? []);
    }
  }, [p.open, p.initial]);

  const toggleTag = (t: string, list: string[], setter: (l: string[]) => void) =>
    setter(list.includes(t) ? list.filter(x => x !== t) : [...list, t]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 3) { toast.error("Maximum 3 photos"); return; }
    setUploading(true);
    try {
      const { blob } = await compressToWebP(file, { maxDimension: 1200, quality: 0.7 });
      const path = `food-reviews/${p.customerId}/${Date.now()}.webp`;
      const { error } = await supabase.storage.from("media-library").upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("media-library").getPublicUrl(path);
      setPhotos(ps => [...ps, data.publicUrl]);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = (url: string) => setPhotos(ps => ps.filter(p => p !== url));

  const submit = async () => {
    if (foodR === 0 && restR === 0) { toast.error("Please rate the food or restaurant"); return; }
    if (comment.length > 500) { toast.error("Review limited to 500 characters"); return; }
    setBusy(true);
    try {
      const payload: any = {
        order_id: p.orderId,
        customer_id: p.customerId,
        restaurant_id: p.restaurantId,
        rider_id: p.riderId || null,
        food_rating: foodR || null,
        restaurant_rating: restR || null,
        rider_rating: riderR || null,
        comment: comment.trim() || null,
        photos,
        tags,
        rider_tags: riderTags,
        status: "approved",
      };
      const { error } = await supabase.from("food_reviews").upsert(payload, { onConflict: "order_id" });
      if (error) throw error;
      toast.success(p.initial ? "Review updated" : "Thanks for your review!");
      p.onSubmitted?.();
      p.onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{p.initial ? "Edit your review" : "Rate your order"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <StarPicker value={foodR} onChange={setFoodR} label="Food quality" Icon={Utensils} />
          <StarPicker value={restR} onChange={setRestR} label="Restaurant (service & packaging)" Icon={ChefHat} />
          {p.riderId && <StarPicker value={riderR} onChange={setRiderR} label="Delivery executive" Icon={Bike} />}

          <div>
            <p className="text-xs font-semibold mb-1.5">Quick tags (food)</p>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_TAGS.map(t => (
                <button key={t} type="button" onClick={() => toggleTag(t, tags, setTags)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${tags.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {p.riderId && (
            <div>
              <p className="text-xs font-semibold mb-1.5">Quick tags (rider)</p>
              <div className="flex flex-wrap gap-1.5">
                {RIDER_TAGS.map(t => (
                  <button key={t} type="button" onClick={() => toggleTag(t, riderTags, setRiderTags)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition ${riderTags.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1.5">Tell us more (optional)</p>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              placeholder="What did you love or want improved?"
              rows={3}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{comment.length}/500</p>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5">Photos (up to 3)</p>
            <div className="flex gap-2 flex-wrap">
              {photos.map(url => (
                <div key={url} className="relative h-16 w-16 rounded-md overflow-hidden">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(url)}
                    className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className="h-16 w-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition">
                  <Camera className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => p.onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || uploading}>
            {busy ? "Submitting…" : p.initial ? "Update review" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
