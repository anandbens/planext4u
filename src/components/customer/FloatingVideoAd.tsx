import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Maximize2, Play, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { VideoAdOverlay } from "./VideoAdOverlay";
import { usePlayableVideoSource } from "@/hooks/usePlayableVideoSource";

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
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const impressionLogged = useRef(false);
  const playableVideoUrl = usePlayableVideoSource(videoUrl);

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

  // Try to autoplay (muted) once mounted; retry when the media becomes playable.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;
    const attemptPlay = async () => {
      if (cancelled) return;
      v.muted = true;
      try {
        await v.play();
        if (!cancelled) setPlaying(true);
      } catch {
        if (!cancelled) setPlaying(false);
      }
    };

    const handleCanPlay = () => {
      void attemptPlay();
    };

    v.preload = "auto";
    v.load();
    void attemptPlay();
    v.addEventListener("canplay", handleCanPlay);

    return () => {
      cancelled = true;
      v.removeEventListener("canplay", handleCanPlay);
    };
  }, [playableVideoUrl]);

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

  const handleTogglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      try {
        await v.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // Fullscreen mode delegates to the existing VideoAdOverlay
  if (fullscreen) {
    return (
      <VideoAdOverlay
        videoUrl={playableVideoUrl || videoUrl}
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
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="fixed z-50 left-2.5 bottom-[5.25rem] md:bottom-8 md:left-8 w-[clamp(96px,21vw,132px)] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl bg-black"
        onClick={handleTogglePlay}
        role="button"
        aria-label="Floating video advertisement"
      >
        <video
          ref={videoRef}
          poster={thumbnailUrl}
          autoPlay
          loop
          muted
          {...({ defaultMuted: true } as any)}
          playsInline
          {...({ "webkit-playsinline": "true" } as Record<string, string>)}
          preload="auto"
          src={playableVideoUrl || videoUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.muted = true;
            v.play().catch(() => {});
          }}
          onError={(e) => {
            const v = e.currentTarget;
            console.warn("[FloatingVideoAd] video error", {
              src: v.currentSrc || v.src,
              code: v.error?.code,
              message: v.error?.message,
            });
          }}
          className="w-full h-full object-cover"
        />

        <button
          onClick={handleClose}
          aria-label="Close ad"
          className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/75 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>

        <button
          onClick={handleExpand}
          aria-label="Expand to fullscreen"
          className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/75 transition-colors"
        >
          <Maximize2 className="h-3 w-3" />
        </button>

        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-6 w-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-3 w-3 text-white fill-white" />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
