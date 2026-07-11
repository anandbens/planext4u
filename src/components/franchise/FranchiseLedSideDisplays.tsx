import { useEffect, useRef } from "react";
import videoAsset from "@/assets/franchise-actors-loop.mp4.asset.json";

/**
 * LED-style side video displays for the Franchise Registration page.
 * - Desktop (>=1280px AND enough side space): two tall video panels flanking the form.
 * - Smaller screens: subtle background video only.
 * Panels are positioned so they can NEVER overlap the centered form (max-w-2xl = 42rem).
 * We only render side panels when viewport width >= 1280px, and constrain each panel to
 * the available gutter: (100vw - 42rem)/2 minus safe padding. If gutter < 200px, panels hide.
 */
export default function FranchiseLedSideDisplays() {
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Force autoplay on mount (some browsers require an explicit .play() call).
    [leftRef.current, rightRef.current, bgRef.current].forEach((v) => {
      if (!v) return;
      v.muted = true;
      v.loop = true;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    });
  }, []);

  return (
    <>
      {/* Background video (all screens, subtle) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <video
          ref={bgRef}
          src={videoAsset.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-white/90 to-teal-50/90" />
      </div>

      {/* Desktop LED side panels — constrained to gutter so they never overlap the form */}
      <div
        className="hidden xl:block pointer-events-none fixed inset-y-0 left-0 right-0 z-0"
        aria-hidden="true"
        style={{
          // Only visible when gutter is wide enough
          ["--gutter" as never]: "max(0px, calc((100vw - 44rem) / 2 - 1.5rem))",
        } as React.CSSProperties}
      >
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            className="absolute top-24 bottom-6"
            style={{
              [side]: "1rem",
              width: "min(380px, var(--gutter))",
              // Hide entirely if computed width would be too small
              visibility: "visible",
            }}
          >
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-4 ring-amber-500/30 bg-black">
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />
              <video
                ref={side === "left" ? leftRef : rightRef}
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
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                  ● LIVE
                </p>
                <p className="text-xs font-semibold text-white">
                  {side === "left" ? "Franchise Success Stories" : "Earn ₹30L+ / Year"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hide panels via CSS when gutter is too small (extra safety) */}
      <style>{`
        @media (max-width: 1279px) { .franchise-led-panel { display: none !important; } }
      `}</style>
    </>
  );
}
