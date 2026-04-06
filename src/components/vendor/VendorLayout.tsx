import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign, User, Wrench,
  Bell, Menu, X, LogOut, CreditCard, History, ChevronRight, Store,
  ArrowLeft, Settings, HelpCircle, Shield, MapPin, TrendingUp, BarChart3,
  ImageIcon
} from "lucide-react";
import p4uLogo from "@/assets/p4u-logo.png";

interface VendorLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

const sidebarItems = [
  { label: "Dashboard", to: "/vendor", icon: LayoutDashboard },
  { label: "Products", to: "/vendor/products", icon: Package },
  { label: "Services", to: "/vendor/services", icon: Wrench },
  { label: "Orders", to: "/vendor/orders", icon: ShoppingCart },
  { label: "Settlements", to: "/vendor/settlements", icon: DollarSign },
  { label: "Payment History", to: "/vendor/payments", icon: History },
  { label: "Bank Account", to: "/vendor/bank", icon: CreditCard },
  { label: "Profile & Settings", to: "/vendor/profile", icon: User },
  { label: "Media Library", to: "/vendor/media", icon: ImageIcon },
];

const bottomNavItems = [
  { label: "Home", to: "/vendor", icon: LayoutDashboard },
  { label: "Products", to: "/vendor/products", icon: Package },
  { label: "Orders", to: "/vendor/orders", icon: ShoppingCart },
  { label: "Payments", to: "/vendor/settlements", icon: DollarSign },
  { label: "Profile", to: "/vendor/profile", icon: User },
];

const quickActions = [
  { label: "Your\nOrders", icon: ShoppingCart, to: "/vendor/orders" },
  { label: "Help &\nSupport", icon: HelpCircle, to: "#" },
  { label: "Store\nInsights", icon: BarChart3, to: "/vendor" },
];

const menuListItems = [
  { label: "Payment History", icon: History, to: "/vendor/payments" },
  { label: "Bank Account", icon: CreditCard, to: "/vendor/bank" },
  { label: "Account & Control", icon: Shield, to: "/vendor/account-control" },
  { label: "Settings", icon: Settings, to: "/vendor/settings" },
];

export function VendorLayout({ children, title }: VendorLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { vendorUser, vendorLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/vendor") return location.pathname === "/vendor";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await vendorLogout();
    navigate("/vendor/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ====== DESKTOP SIDEBAR ====== */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-border/50">
          <Link to="/vendor" className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-1.5 h-10 w-10 flex items-center justify-center shadow-md">
              <img src={p4uLogo} alt="P4U" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold">Vendor Portal</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{vendorUser?.business_name || vendorUser?.name || "Vendor"}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive(item.to)
                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50 space-y-1">
          <Link to="/app" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
            <Store className="h-4 w-4" /> Customer App
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* ====== MOBILE HEADER (Branded, matching customer style) ====== */}
        <header className="sticky top-0 z-30 lg:hidden bg-primary">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/vendor" className="shrink-0">
                  <img src={p4uLogo} alt="P4U" className="h-8 w-8 rounded-lg object-contain" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-primary-foreground truncate">{vendorUser?.business_name || "Vendor Portal"}</h1>
                  <div className="flex items-center gap-1">
                    <Store className="h-3 w-3 text-primary-foreground/60" />
                    <p className="text-[10px] text-primary-foreground/60 truncate">{vendorUser?.name || "Seller Dashboard"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/vendor/settlements" className="flex items-center gap-1 bg-primary-foreground/15 px-2.5 py-1.5 rounded-full">
                  <TrendingUp className="h-3 w-3 text-primary-foreground/80" />
                  <span className="text-xs font-bold text-primary-foreground">Sales</span>
                </Link>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25">
                  <Bell className="h-4 w-4 text-primary-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">2</span>
                </Button>
                <button onClick={() => setMobileMenuOpen(true)} className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                  {vendorUser ? (
                    <span className="text-sm font-bold text-primary-foreground">{vendorUser.name.charAt(0)}</span>
                  ) : (
                    <User className="h-4 w-4 text-primary-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ====== DESKTOP HEADER ====== */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50 px-6 py-3 items-center justify-between">
          <h1 className="text-lg font-bold">{title || "Dashboard"}</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">2</span>
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{vendorUser?.name?.charAt(0) || 'V'}</span>
              </div>
              <div>
                <span className="font-medium text-sm">{vendorUser?.name || "Vendor"}</span>
                <p className="text-[10px] text-muted-foreground">{vendorUser?.business_name}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>

        {/* ====== MOBILE BOTTOM NAV (Zepto-style pill) ====== */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border/30 safe-area-bottom">
          <div className="relative flex items-center justify-around px-1 py-2">
            {bottomNavItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to} className="flex-1 flex flex-col items-center relative">
                  <div className="flex flex-col items-center relative z-10">
                    {active ? (
                      <motion.div
                        layoutId="vendor-nav-pill"
                        className="flex flex-col items-center justify-center bg-primary rounded-[18px] px-3 py-2 -mt-7 relative"
                        style={{ boxShadow: '0 4px 20px -2px hsl(180 100% 30% / 0.45), 0 0 10px 0 hsl(180 100% 30% / 0.2)' }}
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      >
                        <item.icon className="h-4 w-4 text-primary-foreground" />
                        <span className="text-[8px] font-bold text-primary-foreground mt-0.5 leading-tight whitespace-nowrap">{item.label}</span>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[8px] font-medium text-muted-foreground mt-0.5 leading-tight whitespace-nowrap">{item.label}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ====== FULL-SCREEN MOBILE MENU (Matching customer drawer) ====== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 bg-background z-50 lg:hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30 bg-card">
              <button onClick={() => setMobileMenuOpen(false)} className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-lg font-bold">Menu</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Profile Card */}
              <div className="p-5 bg-card">
                <Link to="/vendor/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{vendorUser?.name?.charAt(0) || 'V'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{vendorUser?.name || "Vendor"}</p>
                    <p className="text-sm text-muted-foreground">{vendorUser?.business_name}</p>
                    <p className="text-xs text-muted-foreground">{vendorUser?.email}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </div>

              {/* Quick Action Cards */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-3 gap-3">
                  {quickActions.map((action, i) => (
                    <motion.div key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={action.to} onClick={() => setMobileMenuOpen(false)}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border/50 bg-card hover:bg-accent/50 transition-colors text-center">
                        <action.icon className="h-5 w-5 text-foreground/70" />
                        <span className="text-[11px] font-medium text-foreground/80 whitespace-pre-line leading-tight">{action.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Revenue Summary Card */}
              <div className="px-5 pb-5">
                <Link to="/vendor/settlements" onClick={() => setMobileMenuOpen(false)}
                  className="block p-4 rounded-2xl bg-accent/60 border border-accent">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold">Revenue & Settlements</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Track your earnings and pending settlements</p>
                </Link>
              </div>

              {/* Store Management */}
              <div className="px-5 pb-3">
                <p className="text-sm font-bold mb-3">Store Management</p>
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-dashed divide-border/50">
                  {sidebarItems.map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.03 }}>
                      <Link to={item.to} onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                        <item.icon className="h-5 w-5 text-foreground/60" />
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* More Options */}
              <div className="px-5 pb-3 pt-2">
                <p className="text-sm font-bold mb-3">More</p>
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-dashed divide-border/50">
                  {menuListItems.map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.03 }}>
                      <Link to={item.to} onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                        <item.icon className="h-5 w-5 text-foreground/60" />
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Switch to Customer + Logout */}
              <div className="px-5 py-4 space-y-3">
                <Link to="/app" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-border/50 hover:bg-accent/30 transition-colors">
                  <Store className="h-5 w-5 text-foreground/60" />
                  <span className="text-sm font-medium">Switch to Customer App</span>
                </Link>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors">
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-semibold">Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
