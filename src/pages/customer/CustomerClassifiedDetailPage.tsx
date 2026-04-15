import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin, Clock, MessageCircle, Share2, Heart, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerClassifiedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [liked, setLiked] = useState(false);

  const { data: ad, isLoading } = useQuery({
    queryKey: ["classifiedAd", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classified_ads")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CustomerLayout>
    );
  }

  if (!ad) {
    return (
      <CustomerLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-medium">Ad not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/app/classifieds")}>
            Back to Classifieds
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const images: string[] = Array.isArray(ad.images) ? (ad.images as string[]) : [];
  const postedDate = new Date(ad.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleWhatsApp = () => {
    const shareUrl = `https://www.planext4u.net/app/classifieds/${id}`;
    const msg = encodeURIComponent(
      `Hi, I'm interested in your listing "${ad.title}" priced at ₹${ad.price.toLocaleString()} on planext4u.\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleShare = async () => {
    const displayUrl = `https://www.planext4u.net/app/classifieds/${id}`;
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-share?type=classified&id=${id}`;
    const text = `Check out: ${ad.title} - ₹${ad.price.toLocaleString()}`;
    if (navigator.share) {
      try {
        const imgs = Array.isArray(ad.images) ? ad.images as string[] : [];
        let files: File[] = [];
        if (imgs[0]) {
          try {
            const resp = await fetch(imgs[0]);
            const blob = await resp.blob();
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            files = [new File([blob], `classified.${ext}`, { type: blob.type })];
          } catch {}
        }
        if (files.length && navigator.canShare?.({ files })) {
          await navigator.share({ title: ad.title, text: `${text}\n${displayUrl}`, files });
        } else {
          await navigator.share({ title: ad.title, text, url: ogUrl });
        }
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${displayUrl}`);
      toast.success("Link copied to clipboard");
    }
  };

  const prevImage = () => setCurrentImage((p) => (p === 0 ? images.length - 1 : p - 1));
  const nextImage = () => setCurrentImage((p) => (p === images.length - 1 ? 0 : p + 1));

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto pb-36 md:pb-6">
        {/* Back button */}
        <div className="px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Ad Details</span>
        </div>

        {/* Image Gallery */}
        {images.length > 0 ? (
          <div className="relative w-full aspect-[4/3] bg-secondary/20 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImage}
                src={images[currentImage]}
                alt={ad.title}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-md"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-md"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`h-2 rounded-full transition-all ${i === currentImage ? "w-6 bg-primary" : "w-2 bg-background/70"}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute top-3 right-3 bg-background/70 backdrop-blur text-xs font-medium px-2 py-1 rounded-full">
                {currentImage + 1}/{images.length}
              </div>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="absolute bottom-12 left-0 right-0 flex gap-1.5 justify-center px-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${i === currentImage ? "border-primary shadow-md" : "border-transparent opacity-60"}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-secondary/30 flex items-center justify-center text-6xl">📦</div>
        )}

        {/* Content */}
        <div className="px-4 pt-4 space-y-4">
          {/* Price & Title */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold leading-tight">{ad.title}</h1>
              <button onClick={() => setLiked(!liked)} className="mt-1 shrink-0">
                <Heart className={`h-6 w-6 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
              </button>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">₹{ad.price.toLocaleString()}</p>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ad.area}, {ad.city}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {postedDate}</span>
            <Badge variant="outline" className="text-xs">{ad.category}</Badge>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ad.description}</p>
          </div>

          <Separator />

          {/* Seller Info */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{ad.user_name || "Seller"}</p>
                <p className="text-xs text-muted-foreground">Member since 2024</p>
              </div>
            </div>
          </Card>

          {/* Safety Tips */}
          <Card className="p-3 bg-warning/5 border-warning/20">
            <p className="text-xs font-medium text-warning">⚠️ Safety Tips</p>
            <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-disc pl-4">
              <li>Meet in a public place for transactions</li>
              <li>Don't send money in advance</li>
              <li>Inspect the item before paying</li>
            </ul>
          </Card>
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t p-3 flex gap-2 z-40 max-w-3xl mx-auto">
          <Button variant="outline" size="icon" className="shrink-0" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button className="flex-1 gap-2" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
