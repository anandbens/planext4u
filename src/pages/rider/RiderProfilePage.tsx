import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { foodApi, Rider } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";

export default function RiderProfilePage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      const r = await foodApi.getMyRider();
      if (!r) { navigate('/rider/login'); return; }
      setRider(r);
      setForm({
        name: r.name, email: r.email || "", mobile: r.mobile,
        vehicle_type: r.vehicle_type, vehicle_number: r.vehicle_number || "",
      });
      setLoading(false);
    })();
  }, [navigate]);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const onSave = async () => {
    if (!rider) return;
    setSaving(true);
    try {
      await foodApi.updateRiderProfile(rider.id, form);
      toast.success("Profile updated");
      navigate('/rider');
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!rider) return null;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate('/rider')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold flex-1">My Profile</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Personal</h2>
            <Badge variant={rider.kyc_status === 'verified' ? 'default' : 'secondary'} className="gap-1">
              <ShieldCheck className="h-3 w-3" />{rider.kyc_status}
            </Badge>
          </div>
          <div><Label>Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><Label>Mobile</Label><Input value={form.mobile} disabled /></div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Vehicle</h2>
          <div>
            <Label>Vehicle Type</Label>
            <Select value={form.vehicle_type} onValueChange={v => set('vehicle_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bike">Bike</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="car">Car</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value.toUpperCase())} /></div>
        </Card>

        <Card className="p-4 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => navigate('/rider/kyc')}>Update KYC Documents</Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/rider/earnings')}>View Earnings</Button>
        </Card>

        <Button onClick={onSave} disabled={saving} className="w-full h-11">{saving ? "Saving…" : "Save Changes"}</Button>

        <Button variant="ghost" className="w-full text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate('/rider/login'); }}>
          <LogOut className="h-4 w-4 mr-2" />Sign Out
        </Button>
      </div>
    </div>
  );
}
