import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { foodApi, Rider } from "@/lib/food-api";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminRidersPage() {
  const [list, setList] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Rider> | null>(null);

  const load = async () => {
    setLoading(true);
    setList(await foodApi.listRiders()); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.name || !edit?.mobile || !edit?.vehicle_type) { toast.error("Name, mobile and vehicle type are required"); return; }
    const id = edit.id || "RDR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    await foodApi.upsertRider({ ...edit, id } as any);
    toast.success("Rider saved"); setEdit(null); load();
  };

  return (
    <AdminLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Riders</h1>
          <p className="page-description">{list.length} riders</p>
        </div>
        <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit({ vehicle_type: 'bike', kyc_status: 'pending', status: 'active' })}>
              <Plus className="h-4 w-4 mr-1" />Add Rider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{edit?.id ? 'Edit' : 'New'} Rider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={edit?.name || ""} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label>Mobile</Label><Input value={edit?.mobile || ""} onChange={e => setEdit({ ...edit, mobile: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={edit?.email || ""} onChange={e => setEdit({ ...edit, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vehicle</Label>
                  <Select value={edit?.vehicle_type || 'bike'} onValueChange={v => setEdit({ ...edit, vehicle_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="bicycle">Bicycle</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle No.</Label><Input value={edit?.vehicle_number || ""} onChange={e => setEdit({ ...edit, vehicle_number: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map(r => (
            <Card key={r.id} className="p-4 space-y-2 cursor-pointer" onClick={() => setEdit(r)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.mobile} • {r.vehicle_type} {r.vehicle_number ? `• ${r.vehicle_number}` : ''}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge variant={r.is_online ? "default" : "outline"}>{r.is_online ? "Online" : "Offline"}</Badge>
                  <Badge variant={r.kyc_status === 'verified' ? "default" : "secondary"}>{r.kyc_status}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">★ {r.rating || 'New'} • {r.total_deliveries} trips</div>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No riders yet.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
