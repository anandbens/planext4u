import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SEARCH_ROUTES: { label: string; keywords: string[]; path: string }[] = [
  { label: "Dashboard", keywords: ["dashboard", "home", "overview", "stats"], path: "/" },
  { label: "Customers", keywords: ["customer", "user", "buyer"], path: "/customers" },
  { label: "Product Vendors", keywords: ["product vendor", "seller"], path: "/vendors" },
  { label: "Service Vendors", keywords: ["service vendor"], path: "/cf/vendors" },
  { label: "Products", keywords: ["product", "item", "goods"], path: "/products" },
  { label: "Services", keywords: ["service", "booking"], path: "/admin/services" },
  { label: "Orders", keywords: ["order", "purchase", "transaction"], path: "/orders" },
  { label: "Settlements", keywords: ["settlement", "payout", "payment"], path: "/settlements" },
  { label: "Points", keywords: ["point", "loyalty", "wallet", "reward"], path: "/points" },
  { label: "Referrals", keywords: ["referral", "invite"], path: "/referrals" },
  { label: "Categories", keywords: ["category", "catalog"], path: "/categories" },
  { label: "Tax", keywords: ["tax", "gst", "cess"], path: "/tax" },
  { label: "Reports", keywords: ["report", "analytics", "sales report"], path: "/reports" },
  { label: "Classified Ads", keywords: ["classified", "ad", "listing"], path: "/classifieds" },
  { label: "Banners", keywords: ["banner", "carousel", "hero"], path: "/banners" },
  { label: "Advertisements", keywords: ["advertisement", "ad campaign", "sponsor"], path: "/advertisements" },
  { label: "Website Queries", keywords: ["query", "contact", "support", "ticket"], path: "/website-queries" },
  { label: "Settings", keywords: ["setting", "config", "preference"], path: "/settings" },
  { label: "Occupations", keywords: ["occupation", "job", "profession"], path: "/occupations" },
  { label: "CF City", keywords: ["city", "location"], path: "/cf/city" },
  { label: "CF Area", keywords: ["area", "zone", "pincode"], path: "/cf/area" },
  { label: "Platform Variables", keywords: ["variable", "parameter", "config"], path: "/platform-variables" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const searchResults = searchQuery.trim().length > 0
    ? SEARCH_ROUTES.filter(r =>
        r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.keywords.some(k => k.includes(searchQuery.toLowerCase()))
      ).slice(0, 8)
    : [];

  const handleResultClick = (path: string) => {
    navigate(path);
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 lg:h-16 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-3 lg:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="relative hidden sm:block flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages, features..."
                  className="pl-9 w-full bg-secondary/50 border-0 focus-visible:ring-1 h-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                />
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg border border-border shadow-lg z-50 overflow-hidden">
                    {searchResults.map(r => (
                      <button key={r.path} onClick={() => handleResultClick(r.path)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{r.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user?.role && (
                <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{user.role}</Badge>
              )}
              <NotificationDropdown />
            </div>
          </header>
          <main className="flex-1 p-3 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
