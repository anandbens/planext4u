import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Home, Eye, Shield, Ban } from "lucide-react";

export default function AdminHomesUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const perPage = 20;

  // Get customers who have properties
  const { data } = useQuery({
    queryKey: ["adminHomesUsers", page, search],
    queryFn: async () => {
      // Get all property owners
      const { data: properties } = await supabase.from("properties").select("user_id, user_name").order("created_at", { ascending: false });
      
      // Get unique user IDs
      const userMap = new Map<string, { user_id: string; user_name: string; listing_count: number }>();
      (properties || []).forEach((p: any) => {
        const existing = userMap.get(p.user_id);
        if (existing) {
          existing.listing_count++;
        } else {
          userMap.set(p.user_id, { user_id: p.user_id, user_name: p.user_name || "Unknown", listing_count: 1 });
        }
      });

      let users = Array.from(userMap.values());
      if (search) {
        users = users.filter(u => u.user_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id?.includes(search));
      }

      return { items: users.slice((page - 1) * perPage, page * perPage), total: users.length };
    },
  });

  const users = data?.items || [];
  const total = data?.total || 0;

  // Get user's properties on click
  const { data: userProperties } = useQuery({
    queryKey: ["userProperties", selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data } = await supabase.from("properties").select("*").eq("user_id", selectedUser.user_id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedUser,
  });

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Owners", value: total, icon: <Users className="h-4 w-4" />, color: "bg-primary/10", textColor: "text-primary" },
  ];

  const columns = [
    { key: "user_name", label: "Name", render: (u: any) => <p className="text-sm font-medium">{u.user_name}</p> },
    { key: "user_id", label: "ID", render: (u: any) => <code className="text-[10px] bg-muted px-1 rounded">{u.user_id?.slice(0, 12)}...</code> },
    { key: "listing_count", label: "Listings", render: (u: any) => <Badge variant="outline" className="text-[10px]">{u.listing_count}</Badge> },
    { key: "actions", label: "", render: (u: any) => (
      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>
        <Eye className="h-3 w-3 mr-1" /> View
      </Button>
    )},
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Property Users</h1>
        <DataTable
          columns={columns}
          data={users}
          total={total}
          page={page}
          perPage={perPage}
          totalPages={Math.ceil(total / perPage)}
          onPageChange={setPage}
          onSearch={setSearch}
          summaryWidgets={summaryWidgets}
        />
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogTitle>User: {selectedUser?.user_name}</DialogTitle>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">User ID: {selectedUser?.user_id}</p>
            <p className="text-sm font-medium">Properties ({(userProperties || []).length})</p>
            <div className="space-y-2">
              {(userProperties || []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.locality}, {p.city} • ₹{Number(p.price).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.is_verified && <Shield className="h-4 w-4 text-success" />}
                  </div>
                </div>
              ))}
              {(userProperties || []).length === 0 && <p className="text-sm text-muted-foreground">No properties found</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
