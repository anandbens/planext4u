import { useEffect, useRef } from "react";
import videoAsset from "@/assets/franchise-actors-loop.mp4.asset.json";

const kickAutoplay = (videos: HTMLVideoElement[]) => {
  videos.forEach((v) => {
    try {
      // iOS Safari requires these to be set imperatively (not just as attrs)
      // for autoplay to succeed reliably, especially after bfcache restore.
      v.muted = true;
      (v as any).defaultMuted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("webkit-playsinline", "true");
      v.setAttribute("playsinline", "true");
      v.setAttribute("muted", "");
      if (v.paused) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } catch { /* ignore */ }
  });
};

function useForceAutoplay() {
  const ref = useRef<HTMLVideoElement[]>([]);
  const register = (el: HTMLVideoElement | null) => {
    if (el && !ref.current.includes(el)) {
      ref.current.push(el);
      // Kick immediately on mount so iOS starts playback ASAP.
      kickAutoplay([el]);
      el.addEventListener("loadedmetadata", () => kickAutoplay([el]));
      el.addEventListener("canplay", () => kickAutoplay([el]));
      // If the video pauses (bfcache, backgrounding), resume.
      el.addEventListener("pause", () => {
        if (!el.ended) setTimeout(() => kickAutoplay([el]), 50);
      });
    }
  };
  useEffect(() => {
    kickAutoplay(ref.current);

    // Re-kick on first user gesture (iOS may still block until interaction).
    const once = () => {
      kickAutoplay(ref.current);
      window.removeEventListener("touchstart", once);
      window.removeEventListener("touchend", once);
      window.removeEventListener("click", once);
    };
    window.addEventListener("touchstart", once, { passive: true });
    window.addEventListener("touchend", once, { passive: true });
    window.addEventListener("click", once);

    // Handle bfcache restore on refresh / back-forward navigation (iOS Safari).
    const onPageShow = () => kickAutoplay(ref.current);
    const onVisibility = () => {
      if (document.visibilityState === "visible") kickAutoplay(ref.current);
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    // Retry a few times as the video decodes (mobile Safari can be slow).
    const timers = [300, 900, 2000, 4000].map((ms) =>
      setTimeout(() => kickAutoplay(ref.current), ms),
    );

    // IntersectionObserver: resume playback when panel scrolls back into view.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) kickAutoplay([e.target as HTMLVideoElement]);
        });
      },
      { threshold: 0.1 },
    );
    ref.current.forEach((v) => io.observe(v));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("touchstart", once);
      window.removeEventListener("touchend", once);
      window.removeEventListener("click", once);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);
  return register;
}

/**
 * Desktop-only LED-style side displays flanking the form.
 * On mobile screens NOTHING renders here — use <FranchiseLedMobilePanel />
 * placed below the form for the mobile experience.
 *
 * Z-index: panels sit at `-z-10` (behind everything). Form container should
 * be `relative z-10` (already the case in PublicFranchiseRegistrationPage),
 * so the form always appears on top and never gets overlapped.
 */
export default function FranchiseLedSideDisplays() {
  const register = useForceAutoplay();

  return (
    <div
      className="hidden lg:block pointer-events-none fixed inset-y-0 left-0 right-0 -z-10"
      aria-hidden="true"
    >
      {(["left", "right"] as const).map((side, i) => (
        <div
          key={side}
          className="absolute top-24 bottom-6"
          style={{
            [side]: "1rem",
            width: "clamp(160px, calc((100vw - 44rem) / 2 - 1.5rem), 360px)",
          }}
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-4 ring-amber-500/40 bg-black">
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />
            <video
              ref={register}
              src={videoAsset.url}
              autoPlay
              loop
              muted
              playsInline
              {...({ defaultMuted: true, "webkit-playsinline": "true", "x5-playsinline": "true", "x5-video-player-type": "h5-page" } as Record<string, unknown>)}
              preload="auto"
              disableRemotePlayback
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent z-10">
              <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                ● LIVE
              </p>
              <p className="text-xs font-semibold text-white">
                {i === 0 ? "Franchise Success Stories" : "Earn ₹30L+ / Year"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Mobile-only in-flow LED panel. Render this BELOW the form on small screens.
 * Automatically hides on lg+ (where the side panels take over).
 */
export function FranchiseLedMobilePanel() {
  const register = useForceAutoplay();
  return (
    <div className="lg:hidden mt-4">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl ring-4 ring-amber-500/40 bg-black">
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />
        <video
          ref={register}
          src={videoAsset.url}
          autoPlay
          loop
          muted
          playsInline
          {...({ defaultMuted: true, "webkit-playsinline": "true", "x5-playsinline": "true", "x5-video-player-type": "h5-page" } as Record<string, unknown>)}
          preload="auto"
          disableRemotePlayback
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent z-10">
          <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
            ● LIVE — Franchise Success Stories
          </p>
          <p className="text-sm font-semibold text-white">
            Real partners. Real earnings. Earn ₹30L+ / year.
          </p>
        </div>
      </div>
    </div>
  );
}
