import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, ChevronDown, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CATEGORIES, MOCK_SERVICE_CATEGORIES } from "@/lib/mockData";
import { api } from "@/lib/api";

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
            <Link to="/app" className="text-lg lg:text-xl font-bold text-primary shrink-0 tracking-tight">
              MarketHub
            </Link>

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1 text-sm"
              onClick={() => setMegaMenuOpen(!megaMenuOpen)}>
              <Menu className="h-4 w-4" /> Categories
              <ChevronDown className={`h-3 w-3 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products, services, classifieds..." className="pl-9 bg-secondary/50 border-0 h-10 lg:h-11 text-sm lg:text-base"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </form>

            <div className="flex items-center gap-1 ml-auto">
              <Link to="/app/services" className="hidden lg:block"><Button variant="ghost" size="sm">Services</Button></Link>
              <Link to="/app/classifieds" className="hidden lg:block"><Button variant="ghost" size="sm">Classifieds</Button></Link>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/app/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><User className="h-5 w-5" /></Link></Button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="pb-2 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-secondary/50 border-0 h-10 text-sm"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </form>

          <div className="pb-2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> Mumbai, Andheri West
            <button className="text-primary ml-1 hover:underline">Change</button>
          </div>
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
                ].map(item => (
                  <Link key={item.to} to={item.to} className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mega Menu */}
        <AnimatePresence>
          {megaMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="border-t border-border/50 bg-card overflow-hidden hidden md:block">
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-sm font-bold mb-3 text-primary">Products</h3>
                    <div className="space-y-2">
                      {MOCK_CATEGORIES.map((c) => (
                        <Link key={c.id} to={`/app/browse?category=${c.name}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setMegaMenuOpen(false)}>
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
                        <Link key={c.id} to={`/app/services?category=${c.name}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setMegaMenuOpen(false)}>
                          <span>{c.image}</span> {c.name}
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
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 py-6 lg:py-8 mt-8 lg:mt-12 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">MarketHub</h3>
              <p className="text-xs lg:text-sm text-muted-foreground">Your one-stop destination for products, services, and classified ads.</p>
            </div>
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Shop</h4>
              <div className="space-y-1.5">
                {["Electronics", "Fashion", "Home & Living", "Books"].map((c) => (
                  <Link key={c} to={`/app/browse?category=${c}`} className="text-xs lg:text-sm text-muted-foreground hover:text-foreground block">{c}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Services</h4>
              <div className="space-y-1.5">
                {["Home Services", "Beauty & Wellness", "Appliance Repair", "Fitness"].map((c) => (
                  <Link key={c} to={`/app/services?category=${c}`} className="text-xs lg:text-sm text-muted-foreground hover:text-foreground block">{c}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Support</h4>
              <div className="space-y-1.5">
                {["Help Center", "Contact Us", "Terms of Service", "Privacy Policy"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-muted-foreground block">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 lg:mt-8 pt-4 border-t border-border/50 text-center text-xs lg:text-sm text-muted-foreground">
            © 2026 MarketHub. All rights reserved.
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
                  <span className="absolute -top-0.5 right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold">
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
