import { useState, useEffect } from "react";
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

  const isActive = (path: string) => location.pathname === path;

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

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 bg-[hsl(207,96%,10%)] md:hidden overflow-hidden">
              <div className="px-4 py-4 space-y-2">
                {[
                  { label: "Browse Products", to: "/app/browse" },
                  { label: "Services", to: "/app/services" },
                  { label: "Classifieds", to: "/app/classifieds" },
                  { label: "My Orders", to: "/app/orders" },
                  { label: "My Profile", to: "/app/profile" },
                  { label: "Wishlist", to: "/app/wishlist" },
                  { label: "Wallet", to: "/app/wallet" },
                  { label: "Referrals", to: "/app/referrals" },
                  { label: "Become a Seller", to: "/vendor/login" },
                ].map(item => (
                  <Link key={item.to + item.label} to={item.to} className="block py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>
                ))}
                {customerUser ? (
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block py-2 text-sm font-medium text-destructive">Logout</button>
                ) : (
                  <Link to="/app/login" className="block py-2 text-sm font-medium text-warning" onClick={() => setMobileMenuOpen(false)}>Login / Register</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[hsl(207,96%,10%)] text-white py-8 lg:py-12 mt-8 lg:mt-12 hidden md:block">
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
                <div className="bg-white text-[hsl(207,96%,10%)] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-60">Download on the</span>App Store
                </div>
                <div className="bg-white text-[hsl(207,96%,10%)] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
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

      {/* Mobile Bottom Navigation - 6 tabs matching reference */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 md:hidden safe-area-bottom">
          <div className="flex items-center justify-around py-1.5">
            {navItems.map((item) => {
              const active = item.comingSoon ? false : isActive(item.to);
              const isShopTab = item.label === "Shop";

              const content = (
                <div className="flex flex-col items-center gap-0.5 relative">
                  {isShopTab ? (
                    <motion.div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg bg-primary text-primary-foreground`}
                      animate={active ? { scale: [1, 1.15, 1], y: -4 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                      <item.icon className="h-5 w-5" />
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-0.5 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="relative flex items-center justify-center"
                      animate={active ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                      <item.icon className="h-5 w-5" />
                      {active && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        />
                      )}
                    </motion.div>
                  )}
                  <span className={`text-[9px] font-medium transition-colors ${isShopTab ? 'text-primary font-semibold mt-0.5' : ''} ${active ? 'text-primary font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </div>
              );

              if (item.comingSoon) {
                return (
                  <button key={item.label} onClick={() => toast.info(`${item.label} is coming soon! Stay tuned.`)}
                    className="flex flex-col items-center gap-0.5 relative text-muted-foreground">
                    {content}
                  </button>
                );
              }

              return (
                <Link key={item.to + item.label} to={item.to}
                  className={`flex flex-col items-center gap-0.5 relative transition-all
                    ${isShopTab ? '-mt-4' : ''}
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
