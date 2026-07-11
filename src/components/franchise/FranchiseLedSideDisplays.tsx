import { useEffect, useRef } from "react";
import videoAsset from "@/assets/franchise-actors-loop.mp4.asset.json";

/**
 * LED-style side video displays for the Franchise Registration page.
 * - md+ (>=900px effective) and where gutter beside the max-w-2xl (42rem/672px) form
 *   is wide enough: render two tall video panels in the left/right gutters.
 * - Always renders a subtle body-background video behind the form so the
 *   "franchise AI video" is visible at every viewport.
 * - Autoplay is forced imperatively on mount to defeat mobile browser gating.
 */
export default function FranchiseLedSideDisplays() {
  const videosRef = useRef<HTMLVideoElement[]>([]);

  const registerVideo = (el: HTMLVideoElement | null) => {
    if (el && !videosRef.current.includes(el)) videosRef.current.push(el);
  };

  useEffect(() => {
    const kick = () => {
      videosRef.current.forEach((v) => {
        try {
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch { /* ignore */ }
      });
    };
    kick();
    // Retry after first user interaction (mobile autoplay policy).
    const once = () => { kick(); window.removeEventListener("touchstart", once); window.removeEventListener("click", once); };
    window.addEventListener("touchstart", once, { passive: true });
    window.addEventListener("click", once);
    const t = setTimeout(kick, 1200);
    return () => {
      clearTimeout(t);
      window.removeEventListener("touchstart", once);
      window.removeEventListener("click", once);
    };
  }, []);

  return (
    <>
      {/* Always-on background video (visible on every screen) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <video
          ref={registerVideo}
          src={videoAsset.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/85 via-white/80 to-teal-50/85" />
      </div>

      {/* LED side panels — visible from lg upwards, and only when there's real gutter room */}
      <div
        className="hidden lg:block pointer-events-none fixed inset-y-0 left-0 right-0 z-0"
        aria-hidden="true"
      >
        {(["left", "right"] as const).map((side, i) => (
          <div
            key={side}
            className="absolute top-24 bottom-6"
            style={{
              [side]: "1rem",
              // Gutter beside a 44rem (max-w-2xl + padding) form. Clamp to 160-360px.
              width: "clamp(160px, calc((100vw - 44rem) / 2 - 1.5rem), 360px)",
            }}
          >
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-4 ring-amber-500/40 bg-black">
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />
              <video
                ref={registerVideo}
                src={videoAsset.url}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
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
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/25 via-transparent to-teal-400/25 blur-2xl -z-10" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
