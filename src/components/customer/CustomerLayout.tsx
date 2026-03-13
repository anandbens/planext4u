import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, ClipboardList, User, Menu, ChevronDown, MapPin, X, Heart, Gift, CreditCard, Bell, LogOut, ShoppingBag, Wrench, Megaphone, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MOCK_CATEGORIES, MOCK_SERVICE_CATEGORIES } from "@/lib/mockData";
import { api } from "@/lib/api";
import { LocationModal, loadSelectedLocation } from "@/components/customer/LocationModal";
import { SearchAutocomplete } from "@/components/customer/SearchAutocomplete";
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
  const [cartCount, setCartCount] = useState(0);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(loadSelectedLocation() || "JJ Nagar, Coimbator...");

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
  }, [location.pathname]);

  // Show location modal on first visit
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
      {/* Desktop Header - P4U Brand #011d33 */}
      <header className="sticky top-0 z-40 brand-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 lg:gap-4 py-3">
            <Link to="/app" className="flex items-center gap-2 shrink-0">
              <img src={p4uLogo} alt="Planext4u" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            </Link>

            {/* Location Selector */}
            <button
              onClick={() => setLocationModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-sm border border-white/20 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-white/80 text-xs truncate max-w-[140px]">{selectedLocation}</span>
            </button>

            {/* Search with Autocomplete */}
            <SearchAutocomplete
              onSearch={handleSearch}
              className="flex-1 max-w-xl hidden sm:block"
            />

            {/* Right Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <Link to="/vendor" className="hidden lg:block">
                <Button variant="outline" size="sm" className="text-xs border-white/30 text-white hover:bg-white/10 hover:text-white">Became a Seller</Button>
              </Link>

              {/* Language selector - stub */}
              <div className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs text-white/80 cursor-pointer">
                🇮🇳 ENG <ChevronDown className="h-3 w-3" />
              </div>

              {/* Login Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-white hover:bg-white/10 hover:text-white hidden md:flex">
                    <User className="h-3.5 w-3.5" /> Login <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><User className="h-4 w-4" /> My Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/app/orders" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><Heart className="h-4 w-4" /> Wishlist (1)</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><Gift className="h-4 w-4" /> Rewards</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Membership</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/vendor" className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Seller Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/app/profile" className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notification</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/login" className="flex items-center gap-2 text-destructive"><LogOut className="h-4 w-4" /> Logout</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

          {/* Mobile search */}
          <div className="pb-2 sm:hidden">
            <SearchAutocomplete onSearch={handleSearch} placeholder='Search for "Grocerys"' />
          </div>
        </div>

        {/* Desktop Nav Tabs - Teal brand */}
        <div className="hidden md:block bg-card border-t border-border/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-1 py-1.5">
              {[
                { icon: ShoppingBag, label: "Shop", to: "/app/browse" },
                { icon: Wrench, label: "Services", to: "/app/services" },
                { icon: Megaphone, label: "Socio", to: "/app/classifieds" },
                { icon: CalendarDays, label: "Booking", to: "/app/services" },
                { icon: Megaphone, label: "Classified Ads", to: "/app/classifieds" },
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
                  { label: "Post an Ad", to: "/app/classifieds/post" },
                  { label: "My Orders", to: "/app/orders" },
                  { label: "My Profile", to: "/app/profile" },
                  { label: "Wishlist", to: "/app/profile" },
                  { label: "Rewards", to: "/app/profile" },
                  { label: "Became a Seller", to: "/vendor" },
                ].map(item => (
                  <Link key={item.to + item.label} to={item.to} className="block py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      {/* Footer - P4U Branded with #011d33 background */}
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
              <img src={p4uLogo} alt="Planext4u" className="h-20 w-20 object-contain" />
              <div className="flex flex-col gap-2">
                <div className="bg-white text-[hsl(207,96%,10%)] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-60">Download on the</span>
                  App Store
                </div>
                <div className="bg-white text-[hsl(207,96%,10%)] rounded-lg px-4 py-2 text-center text-xs font-medium cursor-pointer hover:opacity-90">
                  <span className="text-[9px] block opacity-60">GET IT ON</span>
                  Google Play
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 text-center text-xs lg:text-sm text-white/50">
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
                  <span className="absolute -top-0.5 right-1 h-4 w-4 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Location Modal */}
      <LocationModal open={locationModalOpen} onOpenChange={setLocationModalOpen} onSelect={setSelectedLocation} />
    </div>
  );
}
