import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, ChevronDown, MapPin, X, Heart, Gift, CreditCard, Bell, LogOut, ShoppingBag, Wrench, Megaphone, CalendarDays, Wallet, Shield, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { LocationModal, loadSelectedLocation } from "@/components/customer/LocationModal";
import { SearchAutocomplete } from "@/components/customer/SearchAutocomplete";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import p4uLogoDark from "@/assets/p4u-logo-dark.png";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

interface CustomerLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function CustomerLayout({ children, hideNav }: CustomerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerUser, customerLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(loadSelectedLocation() || "JJ Nagar, Coimbator...");

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
  }, [location.pathname]);

  useEffect(() => {
    const hasSelected = loadSelectedLocation();
    if (!hasSelected) {
      const timer = setTimeout(() => setLocationModalOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (query: string) => {
    navigate(`/app/browse?search=${encodeURIComponent(query)}`);
  };

  const handleLogout = () => {
    customerLogout();
    toast.success("Logged out");
    navigate("/app");
  };

  const navItems = [
    { icon: Home, label: "Home", to: "/app" },
    { icon: ShoppingBag, label: "Shop", to: "/app/browse", badge: cartCount },
    { icon: Wrench, label: "Services", to: "/app/services" },
    { icon: Megaphone, label: "Socio", to: "#socio-coming-soon", comingSoon: true },
    { icon: CalendarDays, label: "Booking", to: "#booking-coming-soon", comingSoon: true },
    { icon: Newspaper, label: "Classified", to: "/app/classifieds" },
  ];

  // Smart active state detection using startsWith for sub-routes
  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/browse') return location.pathname.startsWith('/app/browse') || location.pathname.startsWith('/app/product') || location.pathname.startsWith('/app/cart') || location.pathname.startsWith('/app/vendor');
    if (path === '/app/services') return location.pathname.startsWith('/app/services') || location.pathname.startsWith('/app/service/');
    if (path === '/app/classifieds') return location.pathname.startsWith('/app/classifieds');
    return location.pathname === path;
  };

  // Mobile menu items for slide-in drawer
  const mobileMenuItems = [
    { label: "Browse Products", to: "/app/browse", icon: ShoppingBag },
    { label: "Services", to: "/app/services", icon: Wrench },
    { label: "Classifieds", to: "/app/classifieds", icon: Newspaper },
    { label: "My Orders", to: "/app/orders", icon: ClipboardList },
    { label: "My Profile", to: "/app/profile", icon: User },
    { label: "Wishlist", to: "/app/wishlist", icon: Heart },
    { label: "Wallet", to: "/app/wallet", icon: Wallet },
    { label: "Referrals", to: "/app/referrals", icon: Gift },
    { label: "KYC", to: "/app/kyc", icon: Shield },
    { label: "Become a Seller", to: "/vendor/login", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 brand-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 lg:gap-4 py-3">
            <Link to="/app" className="flex items-center gap-2 shrink-0">
              <img src={p4uLogoDark} alt="Planext4u" className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-lg" />
            </Link>

            <button onClick={() => setLocationModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-sm border border-white/20 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-colors">
              <MapPin className="h-3.5 w-3.5 text-warning" />
              <span className="text-white/80 text-xs truncate max-w-[140px]">{selectedLocation}</span>
            </button>

            <SearchAutocomplete onSearch={handleSearch} className="flex-1 max-w-xl hidden sm:block" />

            <div className="flex items-center gap-1 ml-auto">
              <Link to="/vendor/login" className="hidden lg:block">
                <Button size="sm" className="text-xs font-semibold text-foreground hover:opacity-90 border-0" style={{ backgroundColor: '#f9ac1e' }}>Become a Seller</Button>
              </Link>

              {customerUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-white hover:bg-white/10 hover:text-white hidden md:flex">
                      <User className="h-3.5 w-3.5" /> {customerUser.name.split(' ')[0]} <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><User className="h-4 w-4" /> My Profile</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/app/orders" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Orders</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/app/wishlist" className="flex items-center gap-2"><Heart className="h-4 w-4" /> Wishlist</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/app/wallet" className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Wallet</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/app/referrals" className="flex items-center gap-2"><Gift className="h-4 w-4" /> Referrals</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/app/kyc" className="flex items-center gap-2"><Shield className="h-4 w-4" /> KYC</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/vendor/login" className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Seller Account</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive"><LogOut className="h-4 w-4" /> Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/app/login">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-white hover:bg-white/10 hover:text-white hidden md:flex">
                    <User className="h-3.5 w-3.5" /> Login <ChevronDown className="h-3 w-3" />
                  </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" asChild className="relative text-white hover:bg-white/10">
                <Link to="/app/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="pb-2 sm:hidden">
            <SearchAutocomplete onSearch={handleSearch} placeholder='Search for "Groceries"' />
          </div>
        </div>

        {/* Desktop Nav Tabs */}
        <div className="hidden md:block bg-card border-t border-border/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-1 py-1.5">
              {[
                { icon: ShoppingBag, label: "Shop", to: "/app/browse" },
                { icon: Wrench, label: "Services", to: "/app/services" },
                { icon: Megaphone, label: "Socio", to: "#", comingSoon: true },
                { icon: CalendarDays, label: "Booking", to: "#", comingSoon: true },
                { icon: Newspaper, label: "Classified Ads", to: "/app/classifieds" },
              ].map((tab) => (
                tab.comingSoon ? (
                  <button key={tab.label} onClick={() => toast.info(`${tab.label} is coming soon! Stay tuned.`)}
                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-primary/20 bg-card hover:bg-primary/5 text-primary transition-colors">
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </button>
                ) : (
                  <Link key={tab.label} to={tab.to}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-colors
                      ${isActive(tab.to) ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/20 bg-card hover:bg-primary/5 text-primary'}`}>
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Slide-in Menu (App-like right-to-left drawer) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed top-0 right-0 bottom-0 w-[280px] bg-card z-50 md:hidden shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <img src={p4uLogoTeal} alt="Planext4u" className="h-8 w-8 object-contain" />
                    <span className="font-bold text-sm">Menu</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {customerUser && (
                  <div className="p-4 border-b border-border/50 bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {customerUser.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{customerUser.name}</p>
                        <p className="text-[10px] text-muted-foreground">{customerUser.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto py-2">
                  {mobileMenuItems.map((item, i) => (
                    <motion.div
                      key={item.to + item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <Link
                        to={item.to}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                          ${isActive(item.to) ? 'text-primary bg-primary/5 border-r-2 border-primary' : 'text-foreground/80 hover:bg-accent'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 border-t border-border/50">
                  {customerUser ? (
                    <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  ) : (
                    <Link to="/app/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full gap-2">
                        <User className="h-4 w-4" /> Login / Register
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[hsl(var(--brand-dark))] text-white py-8 lg:py-12 mt-8 lg:mt-12 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Info</h3>
              <div className="text-xs lg:text-sm text-white/60 space-y-1">
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
                    <span key={i} className="text-white/60 hover:text-white cursor-pointer text-sm">{icon}</span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Company</h3>
              <div className="space-y-1.5">
                {["Contact Us", "Careers", "About Us", "Press", "Seller"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-white/60 hover:text-white cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Help</h3>
              <div className="space-y-1.5">
                {["Payments", "Shipping", "Cancellation & Return", "FAQ"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-white/60 hover:text-white cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm lg:text-base mb-3">Consumer Policy</h3>
              <div className="space-y-1.5">
                {["Cancellation & Return", "Terms Of Use", "Security", "Privacy", "Sitemap", "Grievance Redressal", "EPR Compliance"].map((c) => (
                  <span key={c} className="text-xs lg:text-sm text-white/60 hover:text-white cursor-pointer block">{c}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-4">
              <img src={p4uLogoDark} alt="Planext4u" className="h-20 w-20 object-contain rounded-xl" />
              <div className="flex flex-col gap-2">
                <div className="bg-white text-[hsl(var(--brand-dark))] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-60">Download on the</span>App Store
                </div>
                <div className="bg-white text-[hsl(var(--brand-dark))] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-60">GET IT ON</span>Google Play
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 text-center text-xs lg:text-sm text-white/50">
            © 2026 Planext4u. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - 6 tabs */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 md:hidden safe-area-bottom">
          <div className="flex items-end justify-around px-1 pt-1.5 pb-1.5">
            {navItems.map((item) => {
              const active = item.comingSoon ? false : isActive(item.to);
              const isShopTab = item.label === "Shop";

              const content = (
                <div className="flex flex-col items-center gap-0.5 relative">
                  {isShopTab ? (
                    <motion.div
                      className="h-12 w-12 -mt-5 rounded-2xl flex items-center justify-center shadow-lg bg-primary text-primary-foreground relative"
                      animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-0.5 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  ) : (
                    <div className="relative flex items-center justify-center h-6">
                      <item.icon className={`h-5 w-5 transition-colors ${active ? 'text-primary' : ''}`} />
                    </div>
                  )}
                  <span className={`text-[9px] font-medium transition-colors leading-tight
                    ${isShopTab ? 'text-primary font-semibold mt-0.5' : ''}
                    ${active && !isShopTab ? 'text-primary font-semibold' : !isShopTab && !active ? 'text-muted-foreground' : ''}`}>
                    {item.label}
                  </span>
                  {/* Active indicator line */}
                  {active && !isShopTab && (
                    <motion.div
                      layoutId="nav-active-line"
                      className="absolute -bottom-1.5 w-5 h-0.5 rounded-full bg-primary"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    />
                  )}
                </div>
              );

              if (item.comingSoon) {
                return (
                  <button key={item.label} onClick={() => toast.info(`${item.label} is coming soon! Stay tuned.`)}
                    className="flex flex-col items-center gap-0.5 relative text-muted-foreground min-w-[48px]">
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.to + item.label} to={item.to}
                  className={`flex flex-col items-center gap-0.5 relative transition-all min-w-[48px]
                    ${active && !isShopTab ? 'text-primary' : !isShopTab ? 'text-muted-foreground' : ''}`}>
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <LocationModal open={locationModalOpen} onOpenChange={setLocationModalOpen} onSelect={setSelectedLocation} />
    </div>
  );
}
