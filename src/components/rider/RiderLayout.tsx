import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bike, ClipboardList, Wallet, User, ArrowLeft, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RiderLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  hideBottomNav?: boolean;
}

const bottomNavItems = [
  { label: "Home", to: "/rider", icon: Bike },
  { label: "Orders", to: "/rider/orders", icon: ClipboardList },
  { label: "Earnings", to: "/rider/earnings", icon: Wallet },
  { label: "Profile", to: "/rider/profile", icon: User },
];

export function RiderLayout({ children, title, showBack, hideBottomNav }: RiderLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const isActive = (path: string) => path === "/rider" ? location.pathname === "/rider" : location.pathname.startsWith(path);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-30 bg-primary" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="px-4 py-3 flex items-center gap-3">
            {showBack && (
              <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 text-primary-foreground" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-primary-foreground truncate">{title}</h1>
              <p className="text-[10px] text-primary-foreground/70">Rider Portal</p>
            </div>
            <Link to="/rider" className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary-foreground" />
            </Link>
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`flex-1 ${hideBottomNav ? '' : 'pb-24'}`}>{children}</main>

      {/* Bottom nav */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border/30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="relative flex items-center justify-around px-1 py-2">
            {bottomNavItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to} className="flex-1 flex flex-col items-center">
                  {active ? (
                    <motion.div
                      layoutId="rider-nav-pill"
                      className="flex flex-col items-center justify-center bg-primary rounded-[18px] px-3 py-2 -mt-7"
                      style={{ boxShadow: '0 4px 20px -2px hsl(var(--primary) / 0.45)' }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    >
                      <item.icon className="h-4 w-4 text-primary-foreground" />
                      <span className="text-[9px] font-bold text-primary-foreground mt-0.5 leading-tight">{item.label}</span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-1">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] font-medium text-muted-foreground mt-0.5">{item.label}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export async function riderLogout(navigate: (path: string) => void) {
  await supabase.auth.signOut();
  navigate("/rider/login");
}
