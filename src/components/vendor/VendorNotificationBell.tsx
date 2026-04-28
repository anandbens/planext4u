import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingCart, DollarSign, AlertTriangle, Check, Clock } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

interface VendorNotification {
  id: string;
  vendor_id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  deep_link: string | null;
  is_read: boolean;
  created_at: string;
}

const iconMap: Record<string, any> = {
  order: ShoppingCart,
  settlement: DollarSign,
  system: AlertTriangle,
};

const colorMap: Record<string, string> = {
  order: "text-primary bg-primary/10",
  settlement: "text-success bg-success/10",
  system: "text-warning bg-warning/10",
};

interface Props {
  iconClassName?: string;
  buttonClassName?: string;
}

export function VendorNotificationBell({ iconClassName, buttonClassName }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id;
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["vendorNotifications", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data } = await supabase
        .from("vendor_notifications" as any)
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data as unknown as VendorNotification[]) || [];
    },
    enabled: !!vendorId,
    refetchInterval: 60000,
  });

  // Realtime subscription for new vendor notifications
  useEffect(() => {
    if (!vendorId) return;
    // Unique channel name per mount to avoid "callbacks after subscribe()" error
    // when StrictMode / re-renders try to reuse a channel that's already subscribed
    const channel = supabase.channel(`vendor_notif_${vendorId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vendor_notifications", filter: `vendor_id=eq.${vendorId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["vendorNotifications", vendorId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!vendorId) return;
      await supabase
        .from("vendor_notifications" as any)
        .update({ is_read: true } as any)
        .eq("vendor_id", vendorId)
        .eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendorNotifications", vendorId] }),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("vendor_notifications" as any).update({ is_read: true } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendorNotifications", vendorId] }),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleClick = (n: VendorNotification) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.deep_link) navigate(n.deep_link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", buttonClassName)}>
          <Bell className={cn("h-[18px] w-[18px]", iconClassName)} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(340px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconMap[n.type] || AlertTriangle;
              const colors = colorMap[n.type] || "text-muted-foreground bg-muted";
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colors)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm", !n.is_read ? "font-semibold" : "font-medium")}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
