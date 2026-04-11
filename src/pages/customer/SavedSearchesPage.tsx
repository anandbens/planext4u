import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, Trash2, Search, MapPin, Home, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const TRANSACTION_LABELS: Record<string, string> = { rent: "Rent", sale: "Buy", lease: "Lease", pg: "PG" };

export default function SavedSearchesPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = customerUser?.customer_id || customerUser?.id || "";

  const { data: searches, isLoading } = useQuery({
    queryKey: ["savedSearches", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("saved_searches" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  const handleDelete = async (id: string) => {
    await supabase.from("saved_searches" as any).delete().eq("id", id);
    toast.success("Search deleted");
    queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
  };

  const handleToggleNotify = async (id: string, notify: boolean) => {
    await supabase.from("saved_searches" as any).update({ notify } as any).eq("id", id);
    toast.success(notify ? "Alerts enabled" : "Alerts disabled");
    queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
  };

  const handleApplySearch = (filters: any) => {
    const params = new URLSearchParams();
    if (filters.transaction_type) params.set("type", filters.transaction_type);
    if (filters.city) params.set("q", filters.city);
    navigate(`/app/find-home?${params.toString()}`);
  };

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-32 md:pb-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Saved Searches</h1>
          <Badge variant="secondary" className="ml-auto">{searches?.length || 0}</Badge>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : !searches?.length ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No saved searches yet</p>
              <p className="text-xs text-muted-foreground mt-1">Save filters from Find Home to get alerts</p>
              <Button className="mt-4" size="sm" onClick={() => navigate("/app/find-home")}>
                <Home className="h-4 w-4 mr-1" /> Browse Properties
              </Button>
            </div>
          ) : (
            searches.map((s: any) => {
              const f = s.filters || {};
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0" onClick={() => handleApplySearch(f)} role="button">
                      <p className="font-semibold text-sm truncate">{s.name || "Saved Search"}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {f.transaction_type && <Badge variant="outline" className="text-[10px] capitalize">{TRANSACTION_LABELS[f.transaction_type] || f.transaction_type}</Badge>}
                        {f.city && <Badge variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{f.city}</Badge>}
                        {f.bhk?.length > 0 && <Badge variant="outline" className="text-[10px]">{f.bhk.join(", ")} BHK</Badge>}
                        {f.property_type?.length > 0 && <Badge variant="outline" className="text-[10px]">{f.property_type.length} types</Badge>}
                        {f.budget && <Badge variant="outline" className="text-[10px]">₹{(f.budget[0]/100000).toFixed(0)}L - ₹{(f.budget[1]/100000).toFixed(0)}L</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Saved {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {s.notify ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Switch checked={s.notify} onCheckedChange={(v) => handleToggleNotify(s.id, v)} className="scale-75" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
