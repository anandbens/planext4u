import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingCart, UserCheck, AlertTriangle, Check, Clock, LifeBuoy, Wallet, Bike } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type NotifType = "vendor" | "rider" | "complaint" | "ticket" | "settlement" | "order";

interface AdminNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  created_at: string;
  route: string;
}

const iconMap: Record<NotifType, any> = {
  order: ShoppingCart,
  vendor: UserCheck,
  rider: Bike,
  complaint: AlertTriangle,
  ticket: LifeBuoy,
  settlement: Wallet,
};

const colorMap: Record<NotifType, string> = {
  order: "text-primary bg-primary/10",
  vendor: "text-success bg-success/10",
  rider: "text-success bg-success/10",
  complaint: "text-destructive bg-destructive/10",
  ticket: "text-warning bg-warning/10",
  settlement: "text-primary bg-primary/10",
};

const READ_KEY = "admin_notifications_read_ids";
const getReadIds = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
};
const setReadIds = (ids: Set<string>) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids))); } catch { /* no-op */ }
};

async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const items: AdminNotification[] = [];

  // Pending vendor approvals
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, business_name, name, created_at, kyc_status, status")
    .or("status.eq.pending,kyc_status.eq.pending")
    .order("created_at", { ascending: false })
    .limit(10);
  (vendors || []).forEach((v: any) => {
    items.push({
      id: `vendor:${v.id}`,
      type: "vendor",
      title: "Vendor approval pending",
      message: `${v.business_name || v.name || v.id} is awaiting verification`,
      created_at: v.created_at,
      route: "/vendors",
    });
  });

  // Pending rider KYC
  const { data: riders } = await supabase
    .from("riders" as any)
    .select("id, name, created_at, kyc_status")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  (riders || []).forEach((r: any) => {
    items.push({
      id: `rider:${r.id}`,
      type: "rider",
      title: "Rider KYC pending",
      message: `${r.name || r.id} submitted KYC for review`,
      created_at: r.created_at,
      route: "/admin/riders/kyc",
    });
  });

  // Open complaints
  const { data: complaints } = await supabase
    .from("complaints")
    .select("id, subject, created_at, status")
    .in("status", ["open", "pending"])
    .order("created_at", { ascending: false })
    .limit(10);
  (complaints || []).forEach((c: any) => {
    items.push({
      id: `complaint:${c.id}`,
      type: "complaint",
      title: "New complaint",
      message: c.subject || `Complaint ${c.id}`,
      created_at: c.created_at,
      route: "/admin/complaints",
    });
  });

  // Open support tickets
  const { data: tickets } = await supabase
    .from("support_tickets" as any)
    .select("id, subject, created_at, status")
    .in("status", ["open", "pending", "awaiting_admin"])
    .order("created_at", { ascending: false })
    .limit(10);
  (tickets || []).forEach((t: any) => {
    items.push({
      id: `ticket:${t.id}`,
      type: "ticket",
      title: "Support ticket awaiting reply",
      message: t.subject || `Ticket ${t.id}`,
      created_at: t.created_at,
      route: "/support-tickets",
    });
  });

  // Pending settlements
  const { data: settlements } = await supabase
    .from("settlements")
    .select("id, vendor_name, amount, created_at, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  (settlements || []).forEach((s: any) => {
    items.push({
      id: `settlement:${s.id}`,
      type: "settlement",
      title: "Settlement pending",
      message: `${s.vendor_name || "Vendor"} • ₹${Number(s.amount || 0).toLocaleString("en-IN")}`,
      created_at: s.created_at,
      route: "/settlements",
    });
  });

  return items
    .filter((i) => !!i.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIdsState] = useState<Set<string>>(() => getReadIds());

  const { data: notifications = [] } = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: fetchAdminNotifications,
    refetchInterval: 60000,
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    setReadIdsState(next);
  };

  const handleClick = (n: AdminNotification) => {
    const next = new Set(readIds);
    next.add(n.id);
    setReadIds(next);
    setReadIdsState(next);
    setOpen(false);
    navigate(n.route);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) qc.invalidateQueries({ queryKey: ["adminNotifications"] }); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(360px,calc(100vw-4rem))] max-w-[calc(100vw-4rem)] p-0" style={{ maxWidth: 'calc(100vw - 4rem)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              You're all caught up. No pending actions.
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconMap[n.type];
              const isRead = readIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                    !isRead && "bg-primary/5"
                  )}
                >
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colorMap[n.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm", !isRead ? "font-semibold" : "font-medium")}>{n.title}</p>
                      {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
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
