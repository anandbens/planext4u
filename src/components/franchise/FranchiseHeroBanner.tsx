import { useEffect, useState } from "react";
import { IndianRupee, TrendingUp, Sparkles } from "lucide-react";
import videoAsset from "@/assets/franchise-warehouse-loop.mp4.asset.json";

// Animated counter that eases up to `target`
function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function FranchiseHeroBanner() {
  const monthly = useCountUp(250000);
  const yearly = useCountUp(3000000);
  const partners = useCountUp(120);

  // Floating rupee coins config (stable per mount)
  const coins = Array.from({ length: 14 });

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10">
      {/* Background looping video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoAsset.url}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      {/* Rich brand overlay: deep navy → teal → warm amber for legibility + premium feel */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(1,29,51,0.88)_0%,rgba(0,80,90,0.78)_45%,rgba(0,153,153,0.62)_75%,rgba(248,159,3,0.45)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(248,159,3,0.25),transparent_60%)]" />

      {/* Floating coins */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {coins.map((_, i) => {
          const left = (i * 7.3) % 100;
          const delay = (i * 0.35) % 4;
          const dur = 4 + ((i * 1.1) % 3);
          const size = 14 + ((i * 3) % 14);
          return (
            <span
              key={i}
              className="absolute text-amber-300/90 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-coin-fall"
              style={{
                left: `${left}%`,
                top: `-${size + 10}px`,
                animationDelay: `${delay}s`,
                animationDuration: `${dur}s`,
                fontSize: `${size}px`,
              }}
            >
              ₹
            </span>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-7 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/20">
          <Sparkles className="h-3 w-3 text-amber-300" />
          Own a P4U Franchise
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight animate-fade-in">
          Turn your ambition into{" "}
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            steady earnings
          </span>
        </h2>
        <p className="mt-1.5 text-sm text-white/85 max-w-lg">
          Join a growing network of proud franchise partners earning every single day.
        </p>

        {/* Earnings tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-3 hover-scale">
            <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold uppercase">
              <IndianRupee className="h-3 w-3" /> Monthly
            </div>
            <div className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums">
              {fmtINR(monthly)}
            </div>
            <div className="text-[10px] text-white/70">avg. potential</div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-3 hover-scale">
            <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold uppercase">
              <TrendingUp className="h-3 w-3" /> Yearly
            </div>
            <div className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums">
              {fmtINR(yearly)}
            </div>
            <div className="text-[10px] text-white/70">projected upside</div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-3 hover-scale">
            <div className="flex items-center gap-1 text-amber-300 text-[10px] font-semibold uppercase">
              <Sparkles className="h-3 w-3" /> Partners
            </div>
            <div className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums">
              {partners}+
            </div>
            <div className="text-[10px] text-white/70">& growing</div>
          </div>
        </div>
      </div>
    </div>
  );
}
