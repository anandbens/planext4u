import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Tag, Ticket, CheckCircle2, XCircle, Clock, BarChart3, FileText, ClipboardList, Plus, ShieldAlert,
} from "lucide-react";

const items = [
  { title: "Dashboard", url: "/admin/coupons/dashboard", icon: LayoutDashboard },
  { title: "Campaigns", url: "/admin/coupons", icon: Tag, end: true },
  { title: "Generate", url: "/admin/coupons/generate", icon: Plus },
  { title: "Inventory", url: "/admin/coupons/inventory", icon: Ticket },
  { title: "Active", url: "/admin/coupons/inventory?status=available", icon: CheckCircle2, matchStart: "/admin/coupons/inventory?status=available" },
  { title: "Used", url: "/admin/coupons/inventory?status=used", icon: XCircle, matchStart: "/admin/coupons/inventory?status=used" },
  { title: "Expired", url: "/admin/coupons/inventory?status=expired", icon: Clock, matchStart: "/admin/coupons/inventory?status=expired" },
  { title: "Reports", url: "/admin/coupons/reports", icon: FileText },
  { title: "Analytics", url: "/admin/coupons/analytics", icon: BarChart3 },
  { title: "Audit Logs", url: "/admin/coupons/audit", icon: ClipboardList },
  { title: "Fraud", url: "/admin/coupons/fraud", icon: ShieldAlert },
];

export function CouponAdminNav() {
  const loc = useLocation();
  const fullPath = loc.pathname + loc.search;
  return (
    <div className="flex flex-wrap gap-1 border-b mb-4 -mt-2 pb-2 overflow-x-auto">
      {items.map((it) => {
        const active = it.matchStart
          ? fullPath.startsWith(it.matchStart)
          : it.end
            ? loc.pathname === it.url && !loc.search
            : loc.pathname.startsWith(it.url);
        return (
          <NavLink
            key={it.url}
            to={it.url}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
          >
            <it.icon className="w-3.5 h-3.5" />
            {it.title}
          </NavLink>
        );
      })}
    </div>
  );
}
