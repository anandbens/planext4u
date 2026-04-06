import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, Banknote,
  Megaphone, Star, Gift, BarChart3, Settings, Image, FileText, LogOut,
  Grid3X3, Wrench, Receipt, MapPin, Map, Tag, Briefcase, SlidersHorizontal,
  MessageSquare, MonitorPlay, ExternalLink, ClipboardList, Headphones, Key,
  Home, Crown, Shield, Filter, Palette, Flag, Heart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/lib/auth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles?: UserRole[];
}

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Customers", url: "/customers", icon: Users, roles: ['admin', 'sales'] },
  { title: "Product Vendors", url: "/vendors", icon: Store, roles: ['admin', 'sales'] },
  { title: "Service Vendors", url: "/cf/vendors", icon: Store, roles: ['admin', 'sales'] },
  { title: "Products", url: "/products", icon: Package, roles: ['admin', 'sales'] },
  { title: "Services", url: "/admin/services", icon: Wrench, roles: ['admin', 'sales'] },
  { title: "Categories", url: "/categories", icon: Grid3X3, roles: ['admin'] },
  { title: "Product Attributes", url: "/admin/product-attributes", icon: SlidersHorizontal, roles: ['admin'] },
];

const financeItems: NavItem[] = [
  { title: "Settlements", url: "/settlements", icon: Banknote, roles: ['admin', 'finance'] },
  { title: "Points", url: "/points", icon: Star, roles: ['admin', 'finance'] },
  { title: "Tax", url: "/tax", icon: Receipt, roles: ['admin', 'finance'] },
  { title: "Vendor Plans", url: "/admin/vendor-plans", icon: Crown, roles: ['admin'] },
];

const reportItems: NavItem[] = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Report Log", url: "/report-log", icon: ClipboardList, roles: ['admin'] },
];

const configItems: NavItem[] = [
  { title: "CF City", url: "/cf/city", icon: MapPin, roles: ['admin'] },
  { title: "CF Area", url: "/cf/area", icon: Map, roles: ['admin'] },
  { title: "CF Categories", url: "/cf/categories", icon: Tag, roles: ['admin'] },
  { title: "CF Services", url: "/cf/services", icon: Wrench, roles: ['admin'] },
  { title: "CF Products", url: "/cf/products", icon: Package, roles: ['admin'] },
];

// P4U Homes admin section
const homesItems: NavItem[] = [
  { title: "All Properties", url: "/admin/properties", icon: Home, roles: ['admin'] },
  { title: "Moderation Queue", url: "/admin/homes/moderation", icon: Flag, roles: ['admin'] },
  { title: "Localities", url: "/admin/localities", icon: MapPin, roles: ['admin'] },
  { title: "Plans & Pricing", url: "/admin/property-plans", icon: Crown, roles: ['admin'] },
  { title: "Amenities & Filters", url: "/admin/homes/amenities", icon: Filter, roles: ['admin'] },
  { title: "Property Users", url: "/admin/homes/users", icon: Users, roles: ['admin'] },
  { title: "Homes CMS", url: "/admin/homes/cms", icon: Palette, roles: ['admin'] },
  { title: "Property Reports", url: "/admin/property-reports", icon: BarChart3, roles: ['admin'] },
];

// P4U Social admin section
const socialItems: NavItem[] = [
  { title: "Social Dashboard", url: "/admin/social", icon: Heart, roles: ['admin'] },
];

const systemItems: NavItem[] = [
  { title: "Push Notifications", url: "/admin/notifications", icon: Megaphone, roles: ['admin'] },
  { title: "Media Library", url: "/admin/media-library", icon: Image, roles: ['admin'] },
  { title: "Onboarding Screens", url: "/admin/onboarding", icon: MonitorPlay, roles: ['admin'] },
  { title: "Occupations", url: "/occupations", icon: Briefcase, roles: ['admin'] },
  { title: "Platform Variables", url: "/platform-variables", icon: SlidersHorizontal, roles: ['admin'] },
  { title: "Popup Banners", url: "/popup-banners", icon: MonitorPlay, roles: ['admin'] },
  { title: "Banners", url: "/banners", icon: Image, roles: ['admin'] },
  { title: "Advertisements", url: "/advertisements", icon: Megaphone, roles: ['admin', 'sales'] },
  { title: "Website Queries", url: "/website-queries", icon: MessageSquare, roles: ['admin', 'sales'] },
  { title: "Support Tickets", url: "/support-tickets", icon: Headphones, roles: ['admin', 'sales'] },
  { title: "Referrals", url: "/referrals", icon: Gift, roles: ['admin'] },
  { title: "Classified Ads", url: "/classifieds", icon: FileText, roles: ['admin', 'sales'] },
  { title: "Integrations", url: "/integrations", icon: Key, roles: ['admin'] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ['admin'] },
];

const portalLinks: NavItem[] = [
  { title: "Customer Portal", url: "/app", icon: ExternalLink },
  { title: "Vendor Portal", url: "/vendor", icon: ExternalLink },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-primary/15 text-primary',
  finance: 'bg-success/15 text-success',
  sales: 'bg-info/15 text-info',
};

interface NavGroupProps {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  userRole: UserRole;
}

function NavGroup({ label, items, collapsed, userRole }: NavGroupProps) {
  const filteredItems = items.filter(item => {
    if (!item.roles) return true;
    if (userRole === 'admin') return true;
    return item.roles.includes(userRole);
  });

  if (filteredItems.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.15em] font-semibold mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                <NavLink to={item.url} end={item.url === "/dashboard"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed ? "px-3 justify-center" : "px-3",
                    "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
                  )}
                  activeClassName="bg-sidebar-primary/20 text-sidebar-primary-foreground border-l-2 border-sidebar-primary">
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
  const role = user?.role || 'admin';

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className={cn("py-5", collapsed ? "px-2" : "px-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
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
        <NavGroup label="Main" items={mainItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="Finance" items={financeItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="Reports" items={reportItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="Configuration" items={configItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="P4U Homes" items={homesItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="P4U Social" items={socialItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="System" items={systemItems} collapsed={collapsed} userRole={role} />
        <NavGroup label="Portals" items={portalLinks} collapsed={collapsed} userRole={role} />
      </SidebarContent>

      <SidebarFooter className={cn("py-4 border-t border-sidebar-border", collapsed ? "px-2" : "px-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-sidebar-accent-foreground">
              {user?.name?.charAt(0) || "A"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.name || "Admin"}</p>
                <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border-0 capitalize", ROLE_COLORS[role])}>{role}</Badge>
              </div>
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
