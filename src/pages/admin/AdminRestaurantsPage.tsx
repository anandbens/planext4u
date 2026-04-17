import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/lib/food-api";
import { toast } from "sonner";

export default function AdminRestaurantsPage() {
  const [list, setList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Restaurant[]) || []); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('restaurants').update({ is_active: active }).eq('id', id);
    load();
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Restaurants</h1>
        <p className="page-description">{list.length} restaurants on the platform</p>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map(r => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.cuisine.join(" • ")}</p>
                </div>
                <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.address}</p>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs">Status: {r.status}</span>
                <Button size="sm" variant="outline" onClick={() => toggleActive(r.id, !r.is_active)}>
                  {r.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No restaurants yet.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
