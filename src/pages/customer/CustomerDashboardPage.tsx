import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Users, Wrench, Tag, Home as HomeIcon, Wallet as WalletIcon, ArrowRight } from "lucide-react";
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
      icon: Wrench,
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

      <div className="min-h-screen w-full relative overflow-hidden">
        {/* Background image layer (blurred + dimmed) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(8px) brightness(0.55)",
            transform: "scale(1.1)",
          }}
          aria-hidden="true"
        />

        {/* Teal gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(160deg, rgba(8,155,150,0.92) 0%, rgba(10,170,164,0.78) 35%, rgba(95,201,195,0.7) 70%, rgba(216,240,238,0.55) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle radial highlights for depth */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 75% 18%, rgba(255,255,255,0.5) 0%, transparent 35%), radial-gradient(circle at 15% 85%, rgba(255,255,255,0.3) 0%, transparent 40%)",
          }}
          aria-hidden="true"
        />

        {/* Safe area top padding for notched devices */}
        <div className="relative z-10 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="h-14 w-14 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 shadow-lg flex items-center justify-center">
              <img src={p4uLogo} alt="Planext4u" className="h-full w-full object-contain" />
            </div>

            <Link
              to="/app/profile"
              className="h-14 w-14 rounded-full overflow-hidden border-2 border-white/60 shadow-lg bg-white/20 backdrop-blur-md flex items-center justify-center"
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
            className="mt-6"
          >
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">
              Welcome!
            </h1>
            <p className="text-white/85 text-sm mt-1">
              Everything you need, in one place.
            </p>
          </motion.div>

          {/* Grid + Center Home button — geometrically centered */}
          <div className="relative mt-6 flex-1 flex items-center justify-center">
            <div className="relative w-full">
              <div className="grid grid-cols-2 gap-4">
                {tiles.map((t, i) => (
                  <motion.button
                    key={t.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * i }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(t.to)}
                    className="group relative rounded-3xl p-4 sm:p-5 text-left bg-white/15 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,40,40,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/25 transition-all duration-300 aspect-square flex flex-col items-center justify-center"
                  >
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/25 backdrop-blur-md border border-white/50 shadow-inner flex items-center justify-center mb-2">
                      <t.icon className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow" strokeWidth={1.6} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white drop-shadow">
                      {t.label}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 text-center whitespace-pre-line leading-tight">
                      {t.tagline}
                    </p>
                    <div className="mt-2 h-7 w-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Home button — geometrically centered at the grid intersection.
                  Because the 2x2 grid uses equal cols + equal rows + uniform gap,
                  top:50% / left:50% with -translate-1/2 lands exactly on the cross. */}
              <motion.button
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate("/app/home")}
                aria-label="Home"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 sm:h-24 sm:w-24 rounded-full flex flex-col items-center justify-center shadow-[0_12px_36px_rgba(0,40,40,0.45)] border-[3px] border-white/80 backdrop-blur-xl z-20"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #0bb3ad 0%, #089b96 70%)",
                }}
              >
                <HomeIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" strokeWidth={2} />
                <span className="text-[10px] sm:text-xs font-semibold text-white mt-0.5">
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
            className="mt-4 w-full rounded-3xl p-4 sm:p-5 bg-white/30 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,80,80,0.18)] flex items-center gap-4 text-left"
          >
            <div
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center shrink-0 shadow-inner"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #0bb3ad 0%, #089b96 70%)",
              }}
            >
              <WalletIcon className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-[#013a3a]">Wallet</h3>
              <p className="text-xs sm:text-sm text-[#013a3a]/70">
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
