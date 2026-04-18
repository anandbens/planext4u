import { useState, useRef, useEffect } from "react";
import { X, Maximize2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { VideoAdOverlay } from "./VideoAdOverlay";

interface FloatingVideoAdProps {
  videoUrl: string;
  thumbnailUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  adId: string;
  autoOpenFullscreen?: boolean;
  onClose: () => void;
}

/**
 * Small floating PiP-style video ad shown on the customer home page.
 * The user can: tap to expand fullscreen, mute/unmute, or close.
 * Auto-plays muted (browser autoplay policy compliant).
 */
export function FloatingVideoAd({
  videoUrl,
  thumbnailUrl,
  ctaText,
  ctaLink,
  adId,
  autoOpenFullscreen = false,
  onClose,
}: FloatingVideoAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const impressionLogged = useRef(false);

  // Track impression once
  useEffect(() => {
    if (impressionLogged.current) return;
    impressionLogged.current = true;
    supabase.from("homepage_analytics" as any).insert({
      entity_type: "video_ad",
      entity_id: adId,
      event_type: "impression",
      session_id: sessionStorage.getItem("p4u_session_id") || "anon",
    } as any).then(() => {});
  }, [adId]);

  // Try to autoplay (muted) once mounted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  // Optionally open fullscreen automatically after a delay (only if explicitly enabled)
  useEffect(() => {
    if (!autoOpenFullscreen) return;
    const t = setTimeout(() => setFullscreen(true), 8000);
    return () => clearTimeout(t);
  }, [autoOpenFullscreen]);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFullscreen(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // Fullscreen mode delegates to the existing VideoAdOverlay
  if (fullscreen) {
    return (
      <VideoAdOverlay
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        ctaText={ctaText}
        ctaLink={ctaLink}
        adId={adId}
        onClose={onClose}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="fixed z-50 left-3 bottom-24 md:bottom-8 md:left-8 w-[32vw] max-w-[140px] md:w-[180px] md:max-w-none aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black"
        onClick={handleTogglePlay}
        role="button"
        aria-label="Floating video advertisement"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Top-left: close (like reference) */}
        <button
          onClick={handleClose}
          aria-label="Close ad"
          className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/75 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Bottom-right: expand to fullscreen (like reference) */}
        <button
          onClick={handleExpand}
          aria-label="Expand to fullscreen"
          className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/75 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        {/* Center play indicator when paused */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
