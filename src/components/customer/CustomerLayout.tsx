import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, ChevronDown, ChevronRight, MapPin, X, Heart, Gift, CreditCard, Bell, LogOut, ShoppingBag, Wrench, Megaphone, CalendarDays, Wallet, Shield, Newspaper, HelpCircle, ArrowLeft, MapPinned, Building, Film, Plus, Compass } from "lucide-react";
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
import p4uLogo from "@/assets/p4u-logo.png";

interface CustomerLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
  socialMode?: boolean;
}

export function CustomerLayout({ children, hideNav, socialMode }: CustomerLayoutProps) {
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

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
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
    { icon: Megaphone, label: "Socio", to: "/app/social" },
    { icon: Building, label: "Find Home", to: "/app/find-home" },
    { icon: Newspaper, label: "Classified", to: "/app/classifieds" },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/browse') return location.pathname.startsWith('/app/browse') || location.pathname.startsWith('/app/product') || location.pathname.startsWith('/app/cart') || location.pathname.startsWith('/app/vendor');
    if (path === '/app/services') return location.pathname.startsWith('/app/services') || location.pathname.startsWith('/app/service/');
    if (path === '/app/social') return location.pathname.startsWith('/app/social');
    if (path === '/app/classifieds') return location.pathname.startsWith('/app/classifieds');
    if (path === '/app/find-home') return location.pathname.startsWith('/app/find-home');
    return location.pathname === path;
  };

  // Find active nav index for pill indicator
  const activeNavIndex = navItems.findIndex(item => isActive(item.to));

  const quickActions = [
    { label: "Your\nOrders", icon: ClipboardList, to: "/app/orders" },
    { label: "Help &\nSupport", icon: HelpCircle, to: "#" },
    { label: "Your\nWishlist", icon: Heart, to: "/app/wishlist" },
  ];

  const menuListItems = [
    { label: "Your Wishlist", icon: Heart, to: "/app/wishlist" },
    { label: "Wallet & Points", icon: Wallet, to: "/app/wallet" },
    { label: "Referrals", icon: Gift, to: "/app/referrals" },
    { label: "KYC Verification", icon: Shield, to: "/app/kyc" },
    { label: "Saved Addresses", icon: MapPinned, to: "/app/profile/edit" },
    { label: "Account Ownership & Control", icon: Shield, to: "/app/account-control" },
    { label: "Become a Seller", icon: ShoppingBag, to: "/app/vendor-register" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ====== MOBILE HEADER (Zepto-style) ====== */}
      <header className="sticky top-0 z-40 md:hidden bg-primary" data-no-safe-area>
        <div className="px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
          {/* Row 1: Logo + Location + Wallet + Profile */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link to="/app" className="shrink-0">
                <img src={p4uLogo} alt="P4U" className="h-8 w-8 rounded-lg object-contain" />
              </Link>
              <button onClick={() => setLocationModalOpen(true)} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary-foreground leading-tight truncate">{selectedLocation}</p>
                    <p className="text-[9px] text-primary-foreground/60 truncate">Pattanam, Coimbatore</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-primary-foreground/60 shrink-0" />
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/app/wallet" className="flex items-center gap-1 bg-primary-foreground/15 px-2.5 py-1.5 rounded-full">
                <span className="text-[10px] text-primary-foreground/80">₹</span>
                <span className="text-xs font-bold text-primary-foreground">0</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(true)} className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                {customerUser ? (
                  <span className="text-sm font-bold text-primary-foreground">{customerUser.name.charAt(0)}</span>
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Horizontal pill tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { label: "planext4u", to: "/app", highlight: true },
              { label: "Shop", to: "/app/browse" },
              { label: "Services", to: "/app/services" },
              { label: "Socio", to: "/app/social" },
              { label: "Find Home", to: "/app/find-home" },
              { label: "Classified", to: "/app/classifieds" },
            ].map((tab) => (
              <Link key={tab.label} to={tab.to}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
                  ${tab.highlight
                    ? 'bg-primary-foreground text-primary'
                    : isActive(tab.to)
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25'
                  }`}>
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Row 3: Search bar */}
          <SearchAutocomplete onSearch={handleSearch} placeholder='Search for "Groceries"' />
        </div>
      </header>

      {/* ====== DESKTOP HEADER (unified with mobile style) ====== */}
      <header className="sticky top-0 z-40 hidden md:block bg-primary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 lg:gap-4 py-3">
            <Link to="/app" className="flex items-center gap-2 shrink-0">
              <img src={p4uLogo} alt="Planext4u" className="h-10 w-10 md:h-11 md:w-11 object-contain rounded-lg" />
            </Link>

            <button onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-1.5 text-sm border border-primary-foreground/20 rounded-lg px-3 py-1.5 bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
              <MapPin className="h-3.5 w-3.5 text-warning" />
              <span className="text-primary-foreground/80 text-xs truncate max-w-[140px]">{selectedLocation}</span>
            </button>

            <SearchAutocomplete onSearch={handleSearch} className="flex-1 max-w-xl" />

            <div className="flex items-center gap-1 ml-auto">
              <Link to="/app/vendor-register" className="hidden lg:block">
                <Button size="sm" className="text-xs font-semibold text-foreground hover:opacity-90 border-0" style={{ backgroundColor: '#f9ac1e' }}>Become a Seller</Button>
              </Link>

              {customerUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
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
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <User className="h-3.5 w-3.5" /> Login <ChevronDown className="h-3 w-3" />
                  </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" asChild className="relative text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/app/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Nav Tabs - same teal bar */}
        <div className="bg-card border-t border-border/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-1 py-1.5">
              {[
                { icon: ShoppingBag, label: "Shop", to: "/app/browse" },
                { icon: Wrench, label: "Services", to: "/app/services" },
                { icon: Megaphone, label: "Socio", to: "/app/social" },
                { icon: Building, label: "Find Home", to: "/app/find-home" },
                { icon: Newspaper, label: "Classified Ads", to: "/app/classifieds" },
              ].map((tab) => (
                  <Link key={tab.label} to={tab.to}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-colors
                      ${isActive(tab.to) ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/20 bg-card hover:bg-primary/5 text-primary'}`}>
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ====== FULL-SCREEN MOBILE MENU (Zepto-style) ====== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 bg-background z-50 md:hidden flex flex-col"
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 pb-4 border-b border-border/30 bg-card safe-area-top"
            >
              <button onClick={() => setMobileMenuOpen(false)} className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-lg font-bold">Menu</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Profile Card */}
              <div className="p-5 bg-card">
                {customerUser ? (
                  <Link to="/app/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{customerUser.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-bold">{customerUser.name}</p>
                      <p className="text-sm text-muted-foreground">{customerUser.mobile || customerUser.email}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ) : (
                  <Link to="/app/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">Login / Register</p>
                      <p className="text-sm text-muted-foreground">Tap to get started</p>
                    </div>
                  </Link>
                )}
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

              {/* Wallet Card */}
              <div className="px-5 pb-5">
                <Link to="/app/wallet" onClick={() => setMobileMenuOpen(false)}
                  className="block p-4 rounded-2xl bg-accent/60 border border-accent">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold">P4U Wallet & Points</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Available Balance</p>
                      <p className="text-lg font-bold">₹0</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-8 rounded-full">Add Balance</Button>
                  </div>
                </Link>
              </div>

              {/* Your Information */}
              <div className="px-5 pb-3">
                <p className="text-sm font-bold mb-3">Your Information</p>
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-dashed divide-border/50">
                  {menuListItems.map((item, i) => (
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

              {/* Logout */}
              {customerUser && (
                <div className="px-5 py-4">
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm font-semibold">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Floating Cart FAB - show on non-cart pages when cart has items */}
      {!hideNav && cartCount > 0 && !location.pathname.startsWith('/app/cart') && !location.pathname.startsWith('/app/payment') && (
        <Link to="/app/cart"
          className="fixed bottom-20 right-4 z-40 md:hidden h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center animate-in fade-in slide-in-from-bottom-4"
          style={{ boxShadow: '0 4px 20px -2px hsl(180 100% 30% / 0.45)' }}>
          <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center font-bold">{cartCount}</span>
        </Link>
      )}

      {/* Mobile Bottom Navigation - Vertical-based */}
      {!hideNav && (() => {
        const path = location.pathname;
        // Determine active vertical
        const isSocial = socialMode || path.startsWith('/app/social');
        const isHome = path.startsWith('/app/find-home');
        const isClassified = path.startsWith('/app/classifieds');
        const isServices = path.startsWith('/app/services') || path.startsWith('/app/service/');
        
        // Social footer
        if (isSocial) {
          const socialTabs = [
            { icon: Home, label: "Home", to: "/app/social", active: path === '/app/social' },
            { icon: Search, label: "Explore", to: "/app/social/explore", active: path.startsWith('/app/social/explore') },
            { icon: Plus, label: "Create", to: "/app/social/create", active: path.startsWith('/app/social/create'), isCenter: true },
            { icon: Film, label: "Reels", to: "/app/social/reels", active: path.startsWith('/app/social/reels') },
            { icon: User, label: "Profile", to: "/app/social/profile", active: path.startsWith('/app/social/profile') },
          ];
          return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
              <div className="flex items-center justify-around px-2 py-2 max-w-xl mx-auto">
                {socialTabs.map(tab => (
                  <Link key={tab.to} to={tab.to} className="flex-1 flex flex-col items-center gap-0.5 py-1">
                    {tab.isCenter ? (
                      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <tab.icon className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : tab.label === 'Profile' ? (
                      <div className={`h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden ${tab.active ? 'border-2 border-foreground' : 'border border-border'}`}>
                        <span className="text-xs font-bold">{customerUser?.name?.charAt(0) || 'U'}</span>
                      </div>
                    ) : (
                      <tab.icon className={`h-5 w-5 ${tab.active ? 'text-foreground fill-current' : 'text-muted-foreground'}`} />
                    )}
                    <span className={`text-[9px] ${tab.active ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{tab.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          );
        }

        // Find Home footer
        if (isHome) {
          const homeTabs = [
            { icon: Home, label: "Home", to: "/app/find-home", active: path === '/app/find-home' },
            { icon: Search, label: "Search", to: "/app/find-home", active: false },
            { icon: Plus, label: "Post", to: "/app/find-home/post", active: path.startsWith('/app/find-home/post'), isCenter: true },
            { icon: Heart, label: "Saved", to: "/app/find-home/saved", active: path.startsWith('/app/find-home/saved') },
            { icon: User, label: "Profile", to: "/app/profile", active: false },
          ];
          return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
              <div className="flex items-center justify-around px-2 py-2 max-w-xl mx-auto">
                {homeTabs.map(tab => (
                  <Link key={tab.to + tab.label} to={tab.to} className="flex-1 flex flex-col items-center gap-0.5 py-1">
                    {tab.isCenter ? (
                      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center -mt-4 shadow-lg">
                        <tab.icon className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <tab.icon className={`h-5 w-5 ${tab.active ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <span className={`text-[9px] ${tab.active ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          );
        }

        // Classified footer
        if (isClassified) {
          const classifiedTabs = [
            { icon: Home, label: "Home", to: "/app/classifieds", active: path === '/app/classifieds' },
            { icon: Search, label: "Browse", to: "/app/classifieds", active: false },
            { icon: Plus, label: "Post Ad", to: "/app/classifieds/post", active: path.startsWith('/app/classifieds/post'), isCenter: true },
            { icon: Megaphone, label: "My Ads", to: "/app/classifieds", active: false },
            { icon: User, label: "Profile", to: "/app/profile", active: false },
          ];
          return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
              <div className="flex items-center justify-around px-2 py-2 max-w-xl mx-auto">
                {classifiedTabs.map(tab => (
                  <Link key={tab.to + tab.label} to={tab.to} className="flex-1 flex flex-col items-center gap-0.5 py-1">
                    {tab.isCenter ? (
                      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center -mt-4 shadow-lg">
                        <tab.icon className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <tab.icon className={`h-5 w-5 ${tab.active ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <span className={`text-[9px] ${tab.active ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          );
        }

        // Services footer
        if (isServices) {
          const serviceTabs = [
            { icon: Home, label: "Home", to: "/app/services", active: path === '/app/services' },
            { icon: Search, label: "Explore", to: "/app/services", active: false },
            { icon: CalendarDays, label: "Bookings", to: "/app/orders", active: false },
            { icon: Heart, label: "Saved", to: "/app/wishlist", active: false },
            { icon: User, label: "Profile", to: "/app/profile", active: false },
          ];
          return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
              <div className="flex items-center justify-around px-2 py-2 max-w-xl mx-auto">
                {serviceTabs.map(tab => (
                  <Link key={tab.to + tab.label} to={tab.to} className="flex-1 flex flex-col items-center gap-0.5 py-1">
                    <tab.icon className={`h-5 w-5 ${tab.active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-[9px] ${tab.active ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          );
        }

        // Default Shop footer
        const shopTabs = [
          { icon: Home, label: "Home", to: "/app", badge: 0 },
          { icon: ShoppingBag, label: "Shop", to: "/app/browse", badge: 0 },
          { icon: Wrench, label: "Services", to: "/app/services", badge: 0 },
          { icon: Building, label: "Find Home", to: "/app/find-home", badge: 0 },
          { icon: Megaphone, label: "Socio", to: "/app/social", badge: 0 },
          { icon: Newspaper, label: "Classified", to: "/app/classifieds", badge: 0 },
        ];
        return (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
            <div className="relative flex items-center justify-around px-1 py-2">
              {shopTabs.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link key={item.to + item.label} to={item.to} className="flex-1 flex flex-col items-center relative">
                    <div className="flex flex-col items-center relative z-10">
                      {active ? (
                        <motion.div
                          layoutId="nav-active-pill"
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
        );
      })()}

      <LocationModal open={locationModalOpen} onOpenChange={setLocationModalOpen} onSelect={setSelectedLocation} />
    </div>
  );
}
