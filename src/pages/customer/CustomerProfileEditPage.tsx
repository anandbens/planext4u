import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, Plus, Trash2, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/activity-log";
import { supabase } from "@/integrations/supabase/client";

interface SavedAddress {
  id: string;
  label: string;
  type: string;
  address_line: string;
  city: string;
  pincode: string;
  is_default: boolean;
}

export default function CustomerProfileEditPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "Rahul Sharma", email: "rahul@example.com", mobile: "+91 98765 43210",
    dob: "1992-05-15", gender: "Male", occupation: "Software Engineer",
  });
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", type: "home", address_line: "", city: "", pincode: "" });

  // Load addresses from DB
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', 'USR-001')
      .order('is_default', { ascending: false });
    if (data) setAddresses(data as SavedAddress[]);
  };

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    logActivity('profile_update', `Profile updated: ${form.name}`);
    toast.success("Profile updated successfully!");
    setLoading(false);
    navigate("/app/profile");
  };

  const addAddress = async () => {
    if (!newAddress.address_line.trim() || !newAddress.city.trim() || !newAddress.pincode.trim()) {
      toast.error("Please fill all address fields");
      return;
    }
    const isFirst = addresses.length === 0;
    const { error } = await supabase.from('customer_addresses').insert({
      customer_id: 'USR-001',
      label: newAddress.label,
      type: newAddress.type,
      address_line: newAddress.address_line,
      city: newAddress.city,
      pincode: newAddress.pincode,
      is_default: isFirst,
    });
    if (error) { toast.error("Failed to save address"); return; }
    logActivity('address_add', `Added address: ${newAddress.label}`);
    toast.success("Address added!");
    setNewAddress({ label: "Home", type: "home", address_line: "", city: "", pincode: "" });
    setShowAddForm(false);
    loadAddresses();
  };

  const deleteAddress = async (id: string) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    logActivity('address_delete', `Deleted address`);
    toast.success("Address removed");
    loadAddresses();
  };

  const setDefault = async (id: string) => {
    // Unset all defaults
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', 'USR-001');
    // Set new default
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    logActivity('address_default', `Set default address`);
    toast.success("Default address updated");
    loadAddresses();
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

        {/* Personal Info */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold">Personal Information</h2>
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
        </Card>

        {/* Saved Addresses */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Saved Addresses</h2>
            <Button variant="outline" size="sm" className="text-xs gap-1 h-8" onClick={() => setShowAddForm(true)}>
              <Plus className="h-3 w-3" /> Add Address
            </Button>
          </div>

          {addresses.length === 0 && !showAddForm && (
            <p className="text-sm text-muted-foreground text-center py-4">No saved addresses. Add your first address.</p>
          )}

          {/* Existing addresses */}
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`p-3 rounded-xl border transition-colors ${addr.is_default ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{addr.label}</span>
                    {addr.is_default && <Badge className="bg-primary/10 text-primary border-0 text-[10px] h-5">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!addr.is_default && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary" onClick={() => setDefault(addr.id)}>
                        <Check className="h-3 w-3" /> Set Default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAddress(addr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-5.5">{addr.address_line}, {addr.city} - {addr.pincode}</p>
              </div>
            ))}
          </div>

          {/* Add new address form */}
          {showAddForm && (
            <Card className="p-4 border-dashed border-2 border-primary/30 space-y-3">
              <h3 className="text-xs font-semibold">New Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Label</label>
                  <Input value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} className="h-9 text-xs" placeholder="Home" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Type</label>
                  <select value={newAddress.type} onChange={e => setNewAddress({...newAddress, type: e.target.value})}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
                    <option value="home">Home</option><option value="work">Work</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Address</label>
                <Input value={newAddress.address_line} onChange={e => setNewAddress({...newAddress, address_line: e.target.value})} className="h-9 text-xs" placeholder="Street address, building, area" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">City</label>
                  <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Pincode</label>
                  <Input value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="h-9 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="text-xs h-8 gap-1 flex-1" onClick={addAddress}><Plus className="h-3 w-3" /> Save Address</Button>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}
        </Card>

        <Button onClick={handleSave} disabled={loading} className="w-full h-12 gap-2 bg-primary">
          <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </CustomerLayout>
  );
}
