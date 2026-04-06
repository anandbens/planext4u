import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingCart, UserCheck, AlertTriangle, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "order" | "vendor" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  route: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "order", title: "New Order Placed", message: "Rahul Sharma placed order #ORD-1842 worth ₹2,750", time: "2 min ago", read: false, route: "/orders" },
  { id: "2", type: "vendor", title: "Vendor Approval Request", message: "GreenMart submitted verification documents", time: "15 min ago", read: false, route: "/vendors" },
  { id: "3", type: "system", title: "Settlement Batch Ready", message: "42 settlements worth ₹3.2L are eligible for payout", time: "1 hr ago", read: false, route: "/settlements" },
  { id: "4", type: "order", title: "Order Cancelled", message: "Meera Joshi cancelled order #ORD-1838", time: "2 hrs ago", read: true, route: "/orders" },
  { id: "5", type: "vendor", title: "Vendor Verified", message: "TechMart completed Level 2 verification", time: "3 hrs ago", read: true, route: "/vendors" },
  { id: "6", type: "system", title: "High Traffic Alert", message: "Platform experiencing 2x normal traffic", time: "5 hrs ago", read: true, route: "/dashboard" },
  { id: "7", type: "order", title: "Refund Requested", message: "Karan Mehta requested refund for #ORD-1835", time: "6 hrs ago", read: true, route: "/orders" },
];

const iconMap = {
  order: ShoppingCart,
  vendor: UserCheck,
  system: AlertTriangle,
};

const colorMap = {
  order: "text-primary bg-primary/10",
  vendor: "text-success bg-success/10",
  system: "text-warning bg-warning/10",
};

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpen(false);
    navigate(n.route);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(380px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colorMap[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {n.time}
                  </p>
                </div>
              </div>
            );
          })}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2 text-center">
          <button onClick={() => { setOpen(false); navigate("/admin/notifications"); }} className="text-xs text-primary hover:underline">
            View all notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
