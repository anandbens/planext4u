import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, X, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CATEGORIES, MOCK_SERVICE_CATEGORIES } from "@/lib/mockData";

interface CustomerLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function CustomerLayout({ children, hideNav }: CustomerLayoutProps) {
  const location = useLocation();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { icon: Home, label: "Home", to: "/app" },
    { icon: Search, label: "Browse", to: "/app/browse" },
    { icon: ShoppingCart, label: "Cart", to: "/app/cart" },
    { icon: ClipboardList, label: "Orders", to: "/app/orders" },
    { icon: User, label: "Profile", to: "/app/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center gap-4 py-3">
            <Link to="/app" className="text-xl font-bold text-primary shrink-0 tracking-tight">
              MarketHub
            </Link>

            {/* Mega Menu Trigger */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-1 text-sm"
              onClick={() => setMegaMenuOpen(!megaMenuOpen)}
            >
              <Menu className="h-4 w-4" />
              Categories
              <ChevronDown className={`h-3 w-3 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Search */}
            <div className="flex-1 max-w-xl relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, services, classifieds..."
                className="pl-9 bg-secondary/50 border-0 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              <Link to="/app/services" className="hidden md:block">
                <Button variant="ghost" size="sm">Services</Button>
              </Link>
              <Link to="/app/classifieds" className="hidden md:block">
                <Button variant="ghost" size="sm">Classifieds</Button>
              </Link>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/app/cart"><ShoppingCart className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/app/profile"><User className="h-5 w-5" /></Link>
              </Button>
            </div>
          </div>

          {/* Location bar */}
          <div className="pb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> Mumbai, Andheri West
            <button className="text-primary ml-1 hover:underline">Change</button>
          </div>
        </div>

        {/* Mega Menu */}
        <AnimatePresence>
          {megaMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border/50 bg-card overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-sm font-bold mb-3 text-primary">Products</h3>
                    <div className="space-y-2">
                      {MOCK_CATEGORIES.map((c) => (
                        <Link
                          key={c.id}
                          to={`/app/browse?category=${c.name}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setMegaMenuOpen(false)}
                        >
                          <span>{c.image}</span> {c.name}
                          <span className="text-[10px] text-muted-foreground ml-auto">{c.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-3 text-primary">Services</h3>
                    <div className="space-y-2">
                      {MOCK_SERVICE_CATEGORIES.map((c) => (
                        <Link
                          key={c.id}
                          to={`/app/services?category=${c.name}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setMegaMenuOpen(false)}
                        >
                          <span>{c.image}</span> {c.name}
                          <span className="text-[10px] text-muted-foreground ml-auto">{c.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-3 text-primary">Classifieds</h3>
                    <div className="space-y-2">
                      {["Electronics", "Vehicles", "Real Estate", "Furniture", "Sports"].map((c) => (
                        <Link
                          key={c}
                          to={`/app/classifieds?category=${c}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
                          onClick={() => setMegaMenuOpen(false)}
                        >
                          {c}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-3 text-primary">Quick Links</h3>
                    <div className="space-y-2">
                      <Link to="/app/orders" className="text-sm text-muted-foreground hover:text-foreground block" onClick={() => setMegaMenuOpen(false)}>My Orders</Link>
                      <Link to="/app/profile" className="text-sm text-muted-foreground hover:text-foreground block" onClick={() => setMegaMenuOpen(false)}>My Profile</Link>
                      <Link to="/app/classifieds/post" className="text-sm text-muted-foreground hover:text-foreground block" onClick={() => setMegaMenuOpen(false)}>Post an Ad</Link>
                      <Link to="/app/cart" className="text-sm text-muted-foreground hover:text-foreground block" onClick={() => setMegaMenuOpen(false)}>Cart</Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 py-8 mt-12 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-sm mb-3">MarketHub</h3>
              <p className="text-xs text-muted-foreground">Your one-stop destination for products, services, and classified ads.</p>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 uppercase tracking-wider text-muted-foreground">Shop</h4>
              <div className="space-y-1.5">
                {["Electronics", "Fashion", "Home & Living", "Books"].map((c) => (
                  <Link key={c} to={`/app/browse?category=${c}`} className="text-xs text-muted-foreground hover:text-foreground block">{c}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 uppercase tracking-wider text-muted-foreground">Services</h4>
              <div className="space-y-1.5">
                {["Home Services", "Beauty & Wellness", "Appliance Repair", "Fitness"].map((c) => (
                  <Link key={c} to={`/app/services?category=${c}`} className="text-xs text-muted-foreground hover:text-foreground block">{c}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 uppercase tracking-wider text-muted-foreground">Support</h4>
              <div className="space-y-1.5">
                {["Help Center", "Contact Us", "Terms of Service", "Privacy Policy"].map((c) => (
                  <span key={c} className="text-xs text-muted-foreground block">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
            © 2026 MarketHub. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive(item.to) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
