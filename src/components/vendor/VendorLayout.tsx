import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign, User, Wrench,
  Bell, Menu, X, LogOut, CreditCard, History, ChevronRight, Store
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
  { label: "Profile", to: "/vendor/profile", icon: User },
];

const bottomNavItems = [
  { label: "Home", to: "/vendor", icon: LayoutDashboard },
  { label: "Products", to: "/vendor/products", icon: Package },
  { label: "Orders", to: "/vendor/orders", icon: ShoppingCart },
  { label: "Payments", to: "/vendor/settlements", icon: DollarSign },
  { label: "Profile", to: "/vendor/profile", icon: User },
];

export function VendorLayout({ children, title }: VendorLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { vendorUser, vendorLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <div className="bg-primary rounded-lg p-1.5 h-9 w-9 flex items-center justify-center">
            <img src={p4uLogo} alt="P4U" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold">Vendor Portal</p>
            <p className="text-[10px] text-muted-foreground truncate">{vendorUser?.business_name || vendorUser?.name || "Vendor"}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.to)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50 lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-sm font-bold">{title || vendorUser?.business_name || "Vendor Portal"}</h1>
                <p className="text-[10px] text-muted-foreground">Vendor Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50 px-6 py-3 items-center justify-between">
          <h1 className="text-lg font-bold">{title || "Dashboard"}</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">2</span>
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{vendorUser?.name || "Vendor"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border/50 safe-bottom">
          <div className="flex items-center justify-around px-2 py-1.5">
            {bottomNavItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="vendor-nav-indicator"
                      className="h-0.5 w-4 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile Slide-in Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary rounded-lg p-1.5 h-9 w-9 flex items-center justify-center">
                    <img src={p4uLogo} alt="P4U" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{vendorUser?.business_name || "Vendor"}</p>
                    <p className="text-[10px] text-muted-foreground">{vendorUser?.email}</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive(item.to)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}
              </nav>
              <div className="p-3 border-t border-border/50 space-y-2">
                <Link to="/app" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary">
                  <Store className="h-4 w-4" /> Customer App
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
