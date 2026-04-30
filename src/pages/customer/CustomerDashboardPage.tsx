import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Users, BriefcaseBusiness, Tag, Home as HomeIcon, Wallet as WalletIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";
import { SplashScreen } from "@/components/customer/SplashScreen";
import p4uLogo from "@/assets/p4u-logo-dark.png";
import dashboardBg from "@/assets/dashboard-food-bg.jpg";

/**
 * Glassmorphic dashboard shown immediately after splash.
 * 2x2 grid of primary modules with a circular Home button at the intersection.
 * Wallet card pinned at the bottom. No CustomerLayout chrome (no bottom navbar).
 */
export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem("p4u_splash_shown")
  );

  useEffect(() => {
    if (!showSplash) sessionStorage.setItem("p4u_splash_shown", "1");
  }, [showSplash]);

  // Profile photo
  const { data: profilePhoto } = useQuery({
    queryKey: ["dash-profile-photo", customerUser?.id],
    queryFn: async () => {
      if (!customerUser?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("profile_photo, wallet_points")
        .eq("id", customerUser.id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!customerUser?.id,
    staleTime: 30_000,
  });

  const walletBalance = (profilePhoto as any)?.wallet_points || 0;
  const initial = (customerUser?.name?.charAt(0) || "U").toUpperCase();

  const tiles = [
    {
      label: "Shop",
      tagline: "Find everything\nyou need",
      icon: ShoppingBag,
      to: "/app/browse",
    },
    {
      label: "Socio",
      tagline: "Connect with\nyour community",
      icon: Users,
      to: "/app/social",
    },
    {
      label: "Services",
      tagline: "Book trusted\nservices",
      icon: BriefcaseBusiness,
      to: "/app/services",
    },
    {
      label: "Classifieds",
      tagline: "Buy, sell & discover\nnear you",
      icon: Tag,
      to: "/app/classifieds",
    },
  ];

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <div className="h-dvh min-h-[100dvh] w-full relative overflow-hidden bg-[#dff4ef]">
        {/* Background image layer — clear food/grain detail like the reference */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            filter: "brightness(0.88) saturate(1.18)",
          }}
          aria-hidden="true"
        />

        {/* Semi-transparent teal wash that keeps the food image recognizable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,155,150,0.86) 0%, rgba(8,155,150,0.63) 25%, rgba(8,155,150,0.22) 43%, rgba(236,250,247,0.72) 58%, rgba(236,250,247,0.92) 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 top-[30%] h-[24%] pointer-events-none blur-2xl"
          style={{ background: "linear-gradient(180deg, rgba(0,131,126,0) 0%, rgba(239,253,250,0.78) 72%, rgba(239,253,250,0) 100%)" }}
          aria-hidden="true"
        />

        {/* Safe area top padding for notched devices */}
        <div className="relative z-10 mx-auto h-full w-full max-w-[768px] px-[4.7vw] pt-[max(env(safe-area-inset-top),3.55rem)] pb-[max(env(safe-area-inset-bottom),0.65rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="h-[clamp(3.5rem,10vw,4.85rem)] w-[clamp(3.5rem,10vw,4.85rem)] rounded-[1.15rem] overflow-hidden bg-white/10 backdrop-blur-md border border-white/25 shadow-[0_12px_28px_rgba(0,60,60,0.18)] flex items-center justify-center">
              <img src={p4uLogo} alt="Planext4u" className="h-full w-full object-contain" />
            </div>

            <Link
              to="/app/profile"
              className="h-[clamp(3.75rem,10.3vw,5rem)] w-[clamp(3.75rem,10.3vw,5rem)] rounded-full overflow-hidden border-[3px] border-white/75 shadow-[0_12px_30px_rgba(0,55,55,0.22)] bg-white/20 backdrop-blur-md flex items-center justify-center"
              aria-label="Profile"
            >
              {(profilePhoto as any)?.profile_photo ? (
                <img
                  src={(profilePhoto as any).profile_photo}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">{initial}</span>
              )}
            </Link>
          </div>

          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-[clamp(2.25rem,6.2vw,3.9rem)]"
          >
            <h1 className="text-[clamp(2.2rem,6.1vw,3.65rem)] leading-none font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,65,65,0.18)]">
              Welcome!
            </h1>
            <p className="text-[clamp(1.12rem,3.35vw,2rem)] leading-tight text-white/95 mt-[clamp(0.8rem,2vw,1.15rem)] drop-shadow-sm">
              Everything you need, in one place.
            </p>
          </motion.div>

          {/* Grid + Center Home button — geometrically centered.
              Symmetric 2x2 grid (equal cols, equal rows via aspect-square, uniform gap)
              guarantees the cross point is exactly at top:50% / left:50%. */}
          <div className="relative mt-[clamp(1.65rem,4.8vw,2.75rem)] flex-none">
            <div className="relative w-full">
              <div className="grid grid-cols-2 grid-rows-2 gap-[clamp(0.5rem,2.6vw,1.18rem)]">
                {tiles.map((t, i) => (
                  <motion.button
                    key={t.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * i }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(t.to)}
                    className="group relative h-[clamp(11.6rem,45.6vw,22.7rem)] rounded-[clamp(1.65rem,4.9vw,3.2rem)] px-3 py-[clamp(1rem,3.8vw,2.1rem)] text-left bg-white/38 backdrop-blur-[36px] border-2 border-white/70 shadow-[0_20px_55px_rgba(15,77,75,0.18),inset_0_1.5px_0_rgba(255,255,255,0.86),inset_0_-30px_80px_rgba(255,255,255,0.34)] hover:bg-white/44 transition-all duration-300 flex flex-col items-center justify-center"
                  >
                    <div className="h-[clamp(4rem,14.4vw,7.15rem)] w-[clamp(4rem,14.4vw,7.15rem)] rounded-full bg-[#089b96]/54 backdrop-blur-2xl border-2 border-white/72 shadow-[0_14px_32px_rgba(0,95,92,0.24),inset_0_18px_28px_rgba(255,255,255,0.18)] flex items-center justify-center mb-[clamp(1.55rem,4vw,2.7rem)]">
                      <t.icon className="h-[clamp(1.75rem,6.2vw,3rem)] w-[clamp(1.75rem,6.2vw,3rem)] text-white drop-shadow-[0_3px_6px_rgba(0,83,80,0.35)]" strokeWidth={1.9} />
                    </div>
                    <h3 className="text-[clamp(1.28rem,4vw,2.55rem)] leading-none font-extrabold text-[#103348] drop-shadow-sm">
                      {t.label}
                    </h3>
                    <p className="text-[clamp(0.88rem,2.7vw,1.7rem)] text-[#1e3149]/88 mt-[clamp(0.9rem,2.3vw,1.45rem)] text-center whitespace-pre-line leading-[1.25]">
                      {t.tagline}
                    </p>
                    <div className="mt-[clamp(1rem,3.1vw,2rem)] h-[clamp(2.15rem,5.8vw,3.7rem)] w-[clamp(2.15rem,5.8vw,3.7rem)] rounded-full bg-[#bfece8]/82 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                      <ArrowRight className="h-[clamp(1.05rem,3.1vw,1.9rem)] w-[clamp(1.05rem,3.1vw,1.9rem)] text-[#078a86]" strokeWidth={3} />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Home button — mathematically centered at the grid intersection. */}
              <motion.button
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate("/app/home")}
                aria-label="Home"
                className="absolute h-[clamp(5.4rem,16.6vw,9.35rem)] w-[clamp(5.4rem,16.6vw,9.35rem)] rounded-full flex flex-col items-center justify-center shadow-[0_18px_42px_rgba(0,82,78,0.38),0_0_0_7px_rgba(255,255,255,0.58),0_0_0_10px_rgba(255,255,255,0.28),inset_0_18px_28px_rgba(255,255,255,0.12)] border-[3px] border-white/85 z-20"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background:
                    "radial-gradient(circle at 30% 30%, #0bb3ad 0%, #089b96 70%)",
                }}
              >
                <HomeIcon className="h-[clamp(1.7rem,5.1vw,2.9rem)] w-[clamp(1.7rem,5.1vw,2.9rem)] text-white drop-shadow-md" strokeWidth={2.6} />
                <span className="text-[clamp(0.8rem,2.5vw,1.45rem)] leading-none font-medium text-white mt-[clamp(0.35rem,1vw,0.55rem)]">
                  Home
                </span>
              </motion.button>
            </div>
          </div>

          {/* Wallet card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/app/wallet")}
            className="mt-4 w-full rounded-3xl p-4 sm:p-5 bg-white/25 backdrop-blur-3xl border border-white/50 shadow-[0_10px_40px_rgba(0,40,40,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] flex items-center gap-4 text-left"
          >
            <div
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #0bb3ad 0%, #089b96 70%)",
              }}
            >
              <WalletIcon className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-[#0a3a3a]">Wallet</h3>
              <p className="text-xs sm:text-sm text-[#0a3a3a]/75">
                Secure payments made easy
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 rounded-full bg-white/50 backdrop-blur-sm border border-white/60">
                <span className="text-sm font-bold text-[#089b96]">
                  {fmt(walletBalance, { decimals: 0 })}
                </span>
              </div>
              <div className="h-7 w-7 rounded-full bg-white/40 flex items-center justify-center">
                <ArrowRight className="h-3.5 w-3.5 text-[#089b96]" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </>
  );
}
