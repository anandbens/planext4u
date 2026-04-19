import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  link_type: string;
  link_target_id: string;
  link_url: string;
  advertiser: string;
  type: string;
}

interface BannerAdProps {
  placement: string;
  className?: string;
  variant?: "banner" | "card" | "inline";
}

export function usePlacementAds(placement: string) {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("advertisements")
      .select("id, title, description, image_url, mobile_image_url, link_type, link_target_id, link_url, advertiser, type, placements")
      .eq("status", "active")
      .lte("start_date", today)
      .gte("end_date", today)
      .then(({ data }) => {
        if (!data) return;
        const filtered = (data as any[]).filter((ad) => {
          const p: string[] = ad.placements || ["all"];
          return p.includes("all") || p.includes(placement);
        });
        setAds(filtered as Ad[]);
      });
  }, [placement]);

  return ads;
}

export function BannerAd({ placement, className = "", variant = "banner" }: BannerAdProps) {
  const ads = usePlacementAds(placement);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (ads.length === 0) return null;

  const visibleAds = ads.filter(a => !dismissed.has(a.id));
  if (visibleAds.length === 0) return null;

  const ad = visibleAds[Math.floor(Math.random() * visibleAds.length)];

  const handleClick = async () => {
    // Track click
    supabase.from("advertisements").update({ clicks: (ad as any).clicks + 1 } as any).eq("id", ad.id).then(() => {});
    // Increment impressions via raw rpc not needed, just navigate
    switch (ad.link_type) {
      case "product":
        navigate(`/app/product/${ad.link_target_id}`);
        break;
      case "category":
        navigate(`/app/browse?category=${ad.link_target_id}`);
        break;
      case "vendor":
        navigate(`/app/vendor/${ad.link_target_id}`);
        break;
      case "service":
        navigate(`/app/services?category=${ad.link_target_id}`);
        break;
      case "custom":
        if (ad.link_url.startsWith("http")) window.open(ad.link_url, "_blank");
        else navigate(ad.link_url);
        break;
      default:
        if (ad.link_url) navigate(ad.link_url);
    }
  };

  const imgSrc = isMobile && ad.mobile_image_url ? ad.mobile_image_url : ad.image_url;

  if (variant === "inline") {
    return (
      <div className={`relative bg-card border border-border rounded-lg overflow-hidden cursor-pointer ${className}`} onClick={handleClick}>
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
          <span className="text-[10px] px-1.5 py-0.5 bg-muted/80 rounded text-muted-foreground">Sponsored</span>
          <button onClick={(e) => { e.stopPropagation(); setDismissed(p => new Set(p).add(ad.id)); }} className="h-5 w-5 rounded-full bg-muted/80 flex items-center justify-center">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        {imgSrc ? (
          <img src={imgSrc} alt={ad.title} className="w-full aspect-square object-cover" loading="lazy" />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{ad.title}</span>
          </div>
        )}
        <div className="p-3">
          <p className="text-xs text-muted-foreground">{ad.advertiser}</p>
          <p className="text-sm font-semibold line-clamp-1">{ad.title}</p>
          {ad.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ad.description}</p>}
          <button className="mt-2 text-xs font-semibold text-primary">Learn More →</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden cursor-pointer group ${className}`} onClick={handleClick}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <span className="text-[10px] px-1.5 py-0.5 bg-background/80 rounded text-muted-foreground backdrop-blur-sm">Ad</span>
        <button onClick={(e) => { e.stopPropagation(); setDismissed(p => new Set(p).add(ad.id)); }} className="h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      {imgSrc ? (
        <img src={imgSrc} alt={ad.title} className="w-full h-20 md:h-40 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
      ) : (
        <div className="w-full h-20 md:h-40 bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
          <div className="text-center text-primary-foreground px-2">
            <p className="font-bold text-sm md:text-lg leading-tight">{ad.title}</p>
            {ad.description && <p className="text-[11px] md:text-sm opacity-90 line-clamp-1">{ad.description}</p>}
          </div>
        </div>
      )}
      {imgSrc && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/70 to-transparent px-2 py-1 md:p-3">
          <p className="text-card text-xs md:text-sm font-semibold leading-tight line-clamp-1">{ad.title}</p>
          <p className="text-card/80 text-[10px] md:text-xs leading-tight line-clamp-1">{ad.advertiser} · Tap to explore</p>
        </div>
      )}
    </div>
  );
}

export function SocialFeedAd({ ad }: { ad: Ad }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleClick = () => {
    supabase.from("advertisements").update({ clicks: 1 } as any).eq("id", ad.id);
    switch (ad.link_type) {
      case "product": navigate(`/app/product/${ad.link_target_id}`); break;
      case "category": navigate(`/app/browse?category=${ad.link_target_id}`); break;
      case "vendor": navigate(`/app/vendor/${ad.link_target_id}`); break;
      case "service": navigate(`/app/services?category=${ad.link_target_id}`); break;
      case "custom":
        if (ad.link_url?.startsWith("http")) window.open(ad.link_url, "_blank");
        else navigate(ad.link_url || "/");
        break;
    }
  };

  const imgSrc = isMobile && ad.mobile_image_url ? ad.mobile_image_url : ad.image_url;

  return (
    <div className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">Ad</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{ad.advertiser}</p>
            <p className="text-[11px] text-muted-foreground">Sponsored</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1"><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>
      <div className="relative aspect-square bg-muted overflow-hidden cursor-pointer" onClick={handleClick}>
        {imgSrc ? (
          <img src={imgSrc} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{ad.title}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3 cursor-pointer" onClick={handleClick}>
        <p className="text-sm font-semibold">{ad.title}</p>
        {ad.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.description}</p>}
        <button className="mt-1 text-xs font-semibold text-primary">Learn More →</button>
      </div>
    </div>
  );
}
