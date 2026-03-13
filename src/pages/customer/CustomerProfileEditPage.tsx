import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/auth";

export default function CustomerProfileEditPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "Rahul Sharma", email: "rahul@example.com", mobile: "+91 98765 43210",
    dob: "1992-05-15", gender: "Male", occupation: "Software Engineer",
    address: "SF NO 250/2, JJ Nagar, Site No 15", city: "Coimbatore", pincode: "641016",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    logActivity('profile_update', `Profile updated: ${form.name}`);
    toast.success("Profile updated successfully!");
    setLoading(false);
    navigate("/app/profile");
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {form.name.charAt(0)}
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11" type="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile</label>
              <Input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="h-11" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date of Birth</label>
              <Input value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="h-11" type="date" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Occupation</label>
              <Input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} className="h-11" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
            <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
              <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="h-11" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pincode</label>
              <Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className="h-11" />
            </div>
          </div>
        </Card>

        <Button onClick={handleSave} disabled={loading} className="w-full h-12 gap-2 bg-primary">
          <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </CustomerLayout>
  );
}
