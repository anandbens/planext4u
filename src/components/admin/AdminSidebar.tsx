import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, Banknote,
  Megaphone, Star, Gift, BarChart3, Settings, Image, FileText, ChevronDown, LogOut,
  Grid3X3, Wrench, Receipt, MapPin, Map, Tag, Briefcase, SlidersHorizontal,
  MessageSquare, MonitorPlay, ExternalLink, ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Points", url: "/points", icon: Star },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Settlements", url: "/settlements", icon: Banknote },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Categories", url: "/categories", icon: Grid3X3 },
  { title: "Services", url: "/admin/services", icon: Wrench },
  { title: "Products", url: "/products", icon: Package },
  { title: "Tax", url: "/tax", icon: Receipt },
];

const reportItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Report Log", url: "/report-log", icon: ClipboardList },
];

const configItems = [
  { title: "CF City", url: "/cf/city", icon: MapPin },
  { title: "CF Area", url: "/cf/area", icon: Map },
  { title: "CF Categories", url: "/cf/categories", icon: Tag },
  { title: "CF Services", url: "/cf/services", icon: Wrench },
  { title: "CF Vendors", url: "/cf/vendors", icon: Store },
  { title: "CF Products", url: "/cf/products", icon: Package },
];

const systemItems = [
  { title: "Occupations", url: "/occupations", icon: Briefcase },
  { title: "Platform Variables", url: "/platform-variables", icon: SlidersHorizontal },
  { title: "Popup Banners", url: "/popup-banners", icon: MonitorPlay },
  { title: "Banners", url: "/banners", icon: Image },
  { title: "Advertisements", url: "/advertisements", icon: Megaphone },
  { title: "Website Queries", url: "/website-queries", icon: MessageSquare },
  { title: "Referrals", url: "/referrals", icon: Gift },
  { title: "Classified Ads", url: "/classifieds", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

const portalLinks = [
  { title: "Customer Portal", url: "/app", icon: ExternalLink },
  { title: "Vendor Portal", url: "/vendor", icon: ExternalLink },
];

interface NavGroupProps {
  label: string;
  items: typeof mainItems;
  collapsed: boolean;
}

function NavGroup({ label, items, collapsed }: NavGroupProps) {
  const location = useLocation();

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
                  )}
                  activeClassName="bg-sidebar-primary/20 text-sidebar-primary-foreground border-l-2 border-sidebar-primary"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-sidebar-primary-foreground">M</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-base font-bold text-sidebar-accent-foreground tracking-tight">Marketplace</h2>
              <p className="text-[11px] text-sidebar-foreground/50">Admin Console</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        <NavGroup label="Main" items={mainItems} collapsed={collapsed} />
        <NavGroup label="Reports" items={reportItems} collapsed={collapsed} />
        <NavGroup label="Configuration" items={configItems} collapsed={collapsed} />
        <NavGroup label="System" items={systemItems} collapsed={collapsed} />
        <NavGroup label="Portals" items={portalLinks} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-sidebar-accent-foreground">
              {user?.name?.charAt(0) || "A"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.email || "admin@marketplace.com"}</p>
            </div>
          )}
          <button onClick={handleLogout} className="text-sidebar-foreground/50 hover:text-sidebar-accent-foreground transition-colors" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
