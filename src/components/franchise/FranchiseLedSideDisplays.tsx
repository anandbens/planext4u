import videoAsset from "@/assets/franchise-actors-loop.mp4.asset.json";

/**
 * LED-style side video displays for the Franchise Registration page.
 * Renders two tall video panels on the left/right of the form on large screens,
 * and a soft background video on small screens.
 */
export default function FranchiseLedSideDisplays() {
  return (
    <>
      {/* Mobile / small screens: subtle body background video */}
      <div className="fixed inset-0 -z-10 overflow-hidden lg:hidden pointer-events-none">
        <video
          src={videoAsset.url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-white/85 to-teal-50/90" />
      </div>

      {/* Desktop: LED-style side panels flanking the form */}
      <div className="hidden lg:block pointer-events-none">
        {[
          "fixed left-4 top-24 bottom-6 w-[calc((100vw-42rem)/2-2rem)] max-w-[420px]",
          "fixed right-4 top-24 bottom-6 w-[calc((100vw-42rem)/2-2rem)] max-w-[420px]",
        ].map((pos, i) => (
          <div key={i} className={`${pos} z-0`}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-4 ring-amber-500/30 bg-black">
              {/* LED bezel */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />
              <video
                src={videoAsset.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {/* LED scanline / glow overlay */}
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
                  {i === 0 ? "Franchise Success Stories" : "Earn ₹30L+ / Year"}
                </p>
              </div>
              {/* Corner glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/20 via-transparent to-teal-400/20 blur-2xl -z-10" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
