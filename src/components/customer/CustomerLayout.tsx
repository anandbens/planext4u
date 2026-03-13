import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, ChevronDown, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CATEGORIES, MOCK_SERVICE_CATEGORIES } from "@/lib/mockData";
import { api } from "@/lib/api";
import p4uLogo from "@/assets/p4u-logo.png";

interface CustomerLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function CustomerLayout({ children, hideNav }: CustomerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const navItems = [
    { icon: Home, label: "Home", to: "/app" },
    { icon: Search, label: "Browse", to: "/app/browse" },
    { icon: ShoppingCart, label: "Cart", to: "/app/cart", badge: cartCount },
    { icon: ClipboardList, label: "Orders", to: "/app/orders" },
    { icon: User, label: "Profile", to: "/app/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 lg:gap-4 py-3">
            {/* P4U Logo */}
            <Link to="/app" className="flex items-center gap-2 shrink-0">
              <img src={p4uLogo} alt="Planext4u" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            </Link>

            {/* Location */}
            <div className="hidden md:flex items-center gap-1.5 text-sm border border-border/50 rounded-lg px-3 py-1.5 bg-secondary/30">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground text-xs">JJ Nagar, Coimbator...</span>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder='Search for "Electronics"' className="pl-9 bg-secondary/50 border-border/60 h-10 lg:h-11 text-sm lg:text-base"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <Link to="/vendor" className="hidden lg:block">
                <Button variant="outline" size="sm" className="text-xs">Became a Seller</Button>
              </Link>
              <Link to="/login" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <User className="h-3.5 w-3.5" /> Login
                </Button>
              </Link>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/app/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
              {/* Mobile menu toggle */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="pb-2 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder='Search for "Grocerys"' className="pl-9 bg-secondary/50 border-border/60 h-10 text-sm"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 bg-card md:hidden overflow-hidden">
              <div className="px-4 py-4 space-y-2">
                {[
                  { label: "Browse Products", to: "/app/browse" },
                  { label: "Services", to: "/app/services" },
                  { label: "Classifieds", to: "/app/classifieds" },
                  { label: "Post an Ad", to: "/app/classifieds/post" },
                  { label: "My Orders", to: "/app/orders" },
                  { label: "My Profile", to: "/app/profile" },
                  { label: "Became a Seller", to: "/vendor" },
                ].map(item => (
                  <Link key={item.to} to={item.to} className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Mega Menu Trigger */}
        <div className="hidden md:block">
          <AnimatePresence>
            {megaMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="border-t border-border/50 bg-card overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 py-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                      <h3 className="text-sm font-bold mb-3 text-primary">Products</h3>
                      <div className="space-y-2">
                        {MOCK_CATEGORIES.map((c) => (
                          <Link key={c.id} to={`/app/browse?category=${c.name}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMegaMenuOpen(false)}>
                            {c.name}
                            <span className="text-[10px] text-muted-foreground ml-auto">{c.count}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold mb-3 text-primary">Services</h3>
                      <div className="space-y-2">
                        {MOCK_SERVICE_CATEGORIES.map((c) => (
                          <Link key={c.id} to={`/app/services?category=${c.name}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMegaMenuOpen(false)}>
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold mb-3 text-primary">Classifieds</h3>
                      <div className="space-y-2">
                        {["Electronics", "Vehicles", "Real Estate", "Furniture", "Sports"].map((c) => (
                          <Link key={c} to={`/app/classifieds?category=${c}`}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
                            onClick={() => setMegaMenuOpen(false)}>{c}</Link>
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
        </div>
      </header>

      <main>{children}</main>

      {/* Footer - P4U Branded */}
      <footer className="bg-primary/5 border-t border-border/50 py-8 lg:py-12 mt-8 lg:mt-12 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Info */}
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Info</h3>
              <div className="text-xs lg:text-sm text-muted-foreground space-y-1">
                <p>SF NO 250/2 JJ NAGAR,</p>
                <p>SITE NO 15,</p>
                <p>NAGAMANAICKEN PALAYAM ROAD,</p>
                <p>PATTANAM POST -</p>
                <p>COIMBATORE 641016</p>
                <p className="mt-3">planext4uofficial@gmail.com</p>
                <p>+91-9787176868</p>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-xs mb-2">Social</h4>
                <div className="flex gap-3">
                  {["𝕏", "f", "in", "📷", "🧵", "▶"].map((icon, i) => (
                    <span key={i} className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">{icon}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Company</h3>
              <div className="space-y-1.5">
                {["Contact Us", "Careers", "About Us", "Press", "Seller"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-muted-foreground hover:text-foreground cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>

            {/* Help */}
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Help</h3>
              <div className="space-y-1.5">
                {["Payments", "Shipping", "Cancellation & Return", "FAQ"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-muted-foreground hover:text-foreground cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>

            {/* Consumer Policy */}
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Consumer Policy</h3>
              <div className="space-y-1.5">
                {["Cancellation & Return", "Terms Of Use", "Security", "Privacy", "Sitemap", "Grievance Redressal", "EPR Compliance"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-muted-foreground hover:text-foreground cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>

            {/* Logo + App Links */}
            <div className="flex flex-col items-center lg:items-end gap-4">
              <img src={p4uLogo} alt="Planext4u" className="h-20 w-20 object-contain" />
              <div className="flex flex-col gap-2">
                <div className="bg-foreground text-background rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-80">Download on the</span>
                  App Store
                </div>
                <div className="bg-foreground text-background rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-80">GET IT ON</span>
                  Google Play
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-border/50 text-center text-xs lg:text-sm text-muted-foreground">
            © 2026 Planext4u. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${isActive(item.to) ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-0.5 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
