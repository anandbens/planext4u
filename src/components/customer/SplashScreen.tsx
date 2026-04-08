import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import p4uLogo from "@/assets/p4u-logo-dark.png";

interface SplashScreenProps {
  onComplete: () => void;
}

interface SplashData {
  title: string;
  tagline: string;
  image_url: string;
  background_color: string;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [splash, setSplash] = useState<SplashData | null>(null);

  useEffect(() => {
    // Fetch a random active splash screen for customer
    supabase
      .from("splash_screens" as any)
      .select("title, tagline, image_url, background_color")
      .in("app_type", ["customer", "both"])
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const random = data[Math.floor(Math.random() * data.length)] as any;
          setSplash(random);
        }
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const bgColor = splash?.background_color || "hsl(180, 100%, 30%)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: bgColor }}
        >
          {/* Background image if available */}
          {splash?.image_url && (
            <motion.img
              src={splash.image_url}
              alt=""
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.25, scale: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 relative z-10"
          >
            <motion.img
              src={p4uLogo}
              alt="Planext4u"
              className="h-24 w-24 md:h-32 md:w-32 object-contain rounded-2xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex items-center">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-2xl md:text-3xl font-bold tracking-wider"
                style={{ color: "hsl(180, 33%, 94%)" }}
              >
                Planext 4u
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.7 }}
                className="text-xs font-semibold ml-1 -mt-3"
                style={{ color: "hsl(37, 95%, 49%)" }}
              >
                TM
              </motion.span>
            </div>
            {/* Dynamic tagline */}
            {splash?.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="text-sm text-white/80 text-center px-8 max-w-xs"
              >
                {splash.tagline}
              </motion.p>
            )}
            {/* Loading dots */}
            <motion.div className="flex gap-1.5 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{ background: "hsl(0, 0%, 100%)" }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
