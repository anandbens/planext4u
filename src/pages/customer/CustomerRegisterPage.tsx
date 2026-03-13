import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Gift, User, Mail, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", city: "Coimbatore", area: "", referral_code: "", occupation: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const captureLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); toast.success("Location captured!"); },
      () => { setGeoLoading(false); toast.error("Location access denied"); },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.email) { toast.error("Please fill all required fields"); return; }
    setLoading(true);
    try {
      await api.registerCustomer(form);
      toast.success("🎉 Registration successful!", { duration: 5000 });
      setTimeout(() => toast.info("📧 Welcome email sent to " + form.email, { description: "Check your inbox for activation link and password setup.", duration: 6000 }), 1000);
      setTimeout(() => toast.info("📱 Welcome SMS sent to " + form.mobile, { description: "You've earned 200 welcome points!", duration: 5000 }), 2500);
      logActivity('registration', `New customer registered: ${form.name} (${form.email})`);
      navigate("/app/login");
    } catch { toast.error("Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary pt-8 pb-12 px-6 flex flex-col items-center relative">
        <Link to="/app/login" className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-lg font-bold">Create Account</h2>
        <p className="text-primary-foreground/60 text-xs">Join Planext4u and start shopping</p>
      </div>
      <div className="max-w-md mx-auto -mt-6 px-4 pb-8">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pl-10 h-11" /></div>
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Mobile Number *" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="pl-10 h-11" type="tel" /></div>
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Email Address *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="pl-10 h-11" type="email" /></div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="h-11" />
              <Input placeholder="Area" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="h-11" />
            </div>
            <Input placeholder="Occupation" value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} className="h-11" />
            <Button type="button" variant="outline" className="w-full h-11 gap-2" onClick={captureLocation} disabled={geoLoading}>
              <MapPin className="h-4 w-4" /> {geoLoading ? "Capturing..." : location ? "📍 Location Captured" : "Capture Location"}
            </Button>
            <div className="relative"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Referral Code (optional)" value={form.referral_code} onChange={e => setForm({...form, referral_code: e.target.value})} className="pl-10 h-11" /></div>
            <Button type="submit" className="w-full h-12 text-base bg-primary" disabled={loading}>{loading ? "Creating Account..." : "Create Account"}</Button>
            <p className="text-xs text-muted-foreground text-center">Already have an account? <Link to="/app/login" className="text-primary font-semibold hover:underline">Sign In</Link></p>
            <p className="text-[10px] text-muted-foreground text-center">By registering, you agree to our Terms of Service and Privacy Policy. A welcome email with activation link and SMS will be sent upon registration.</p>
          </form>
        </Card>
      </div>
    </div>
  );
}