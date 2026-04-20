import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bike } from "lucide-react";

export default function RiderRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", password: "",
    vehicle_type: "bike", vehicle_number: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.mobile || !form.password) {
      toast.error("Please fill all required fields"); return;
    }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) { toast.error("Enter a valid 10-digit Indian mobile"); return; }
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: signup, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, role: "rider" }, emailRedirectTo: `${window.location.origin}/rider` },
      });
      if (signErr) throw signErr;
      const userId = signup.user?.id;
      if (!userId) throw new Error("Account creation failed");

      // 2. Create rider row
      const riderId = "RDR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const { error: rErr } = await supabase.from("riders").insert({
        id: riderId,
        user_id: userId,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number || null,
        kyc_status: "pending",
        status: "active",
      } as any);
      if (rErr) throw rErr;

      // 3. Grant rider role
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: userId, role: "rider" as any,
      } as any);
      if (roleErr) console.warn("role insert", roleErr);

      toast.success("Account created! Please complete your KYC.");
      navigate("/rider/kyc");
    } catch (err: any) {
      toast.error(err.message || "Could not register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Bike className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Become a P4U Rider</h1>
          <p className="text-xs text-muted-foreground mt-1">Sign up and start earning</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div><Label>Full Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} required /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
          <div><Label>Mobile (10 digit)</Label><Input value={form.mobile} onChange={e => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} required /></div>
          <div><Label>Password (min 8 chars)</Label><Input type="password" value={form.password} onChange={e => set("password", e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="bicycle">Bicycle</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Vehicle No.</Label><Input value={form.vehicle_number} onChange={e => set("vehicle_number", e.target.value.toUpperCase())} placeholder="KA01AB1234" /></div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating account…" : "Sign Up"}</Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Already a rider? <Link to="/rider/login" className="text-primary font-medium">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
