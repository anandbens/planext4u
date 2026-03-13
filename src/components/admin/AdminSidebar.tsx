import {
  LayoutDashboard, Users, Store, Package, ShoppingCart, Banknote,
  Megaphone, Star, Gift, BarChart3, Settings, Image, FileText, ChevronDown, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Products", url: "/products", icon: Package },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Settlements", url: "/settlements", icon: Banknote },
  { title: "Classified Ads", url: "/classifieds", icon: Megaphone },
];

const engagementItems = [
  { title: "Loyalty Points", url: "/points", icon: Star },
  { title: "Referrals", url: "/referrals", icon: Gift },
];

const insightItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const systemItems = [
  { title: "CMS", url: "/cms", icon: Image },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface NavGroupProps {
  label: string;
  items: typeof mainItems;
  collapsed: boolean;
}

function NavGroup({ label, items, collapsed }: NavGroupProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
        <NavGroup label="Engagement" items={engagementItems} collapsed={collapsed} />
        <NavGroup label="Insights" items={insightItems} collapsed={collapsed} />
        <NavGroup label="System" items={systemItems} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-semibold text-sidebar-accent-foreground">A</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">Admin User</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">admin@marketplace.com</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
