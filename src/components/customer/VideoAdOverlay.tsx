import { useState, useRef, useEffect } from "react";
import { X, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface VideoAdOverlayProps {
  videoUrl: string;
  thumbnailUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  adId: string;
  onClose: () => void;
}

export function VideoAdOverlay({ videoUrl, thumbnailUrl, ctaText, ctaLink, adId, onClose }: VideoAdOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Track impression
    supabase.from("homepage_analytics" as any).insert({
      entity_type: "video_ad", entity_id: adId, event_type: "impression",
      session_id: sessionStorage.getItem("p4u_session_id") || "anon",
    } as any);
  }, [adId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => { if (v.duration) setProgress((v.currentTime / v.duration) * 100); };
    const onEnd = () => setTimeout(onClose, 500);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); };
  }, [onClose]);

  const handleCTA = () => {
    supabase.from("homepage_analytics" as any).insert({
      entity_type: "video_ad", entity_id: adId, event_type: "click",
      session_id: sessionStorage.getItem("p4u_session_id") || "anon",
    } as any);
    if (ctaLink) window.location.href = ctaLink;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-10">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
          className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {/* Video */}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          autoPlay
          muted={muted}
          playsInline
          className="w-full h-full object-contain"
        />

        {/* CTA at bottom */}
        {ctaText && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 px-6">
            <Button
              onClick={handleCTA}
              className="gap-2 rounded-full px-8 py-3 text-base font-semibold shadow-2xl"
              size="lg"
            >
              {ctaText} <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
