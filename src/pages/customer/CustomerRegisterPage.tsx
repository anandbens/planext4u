import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { MapPin, Gift } from "lucide-react";

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", city: "", area: "", referral_code: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured!");
        setGeoLoading(false);
      },
      () => {
        toast.error("Unable to get location. Please enable location access.");
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim() || !form.email.trim() || !form.city.trim() || !form.area.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.registerCustomer(form);
      toast.success("Account created! Welcome bonus of 200 points credited. 🎉");
      navigate("/app");
    } catch {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-primary-foreground">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join MarketHub and start shopping</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Mobile Number *</Label>
              <Input placeholder="+91 98765 43210" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1.5" maxLength={15} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" maxLength={255} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input placeholder="Mumbai" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Area *</Label>
                <Input placeholder="Andheri" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full gap-2" onClick={captureLocation} disabled={geoLoading}>
              <MapPin className="h-4 w-4" />
              {geoLoading ? "Detecting..." : location ? "Location Captured ✓" : "Capture Location"}
            </Button>

            <div>
              <Label className="flex items-center gap-1"><Gift className="h-3.5 w-3.5 text-primary" /> Referral Code (optional)</Label>
              <Input placeholder="Enter referral code" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} className="mt-1.5" />
            </div>

            <div className="bg-success/10 text-success rounded-lg p-3 text-xs font-medium text-center">
              🎁 Get 200 welcome bonus points on registration!
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Already have an account? <Link to="/app" className="text-primary hover:underline">Sign In</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
