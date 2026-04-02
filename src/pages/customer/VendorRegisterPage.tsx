import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: customerUser?.name || '',
    phone: customerUser?.mobile || '',
    secondary_phone: '',
    email: customerUser?.email || '',
    state: '',
    city: '',
    fb_link: '',
    instagram_link: '',
    business_name: '',
    business_type: 'proprietorship',
    store_name: '',
    category: 'product',
    business_description: '',
    gst_number: '',
    pan_number: '',
    aadhaar_number: '',
  });

  const updateField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim() || form.name.length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s]+$/.test(form.name)) return "Name can only contain letters and spaces";
    if (!/^\d{10}$/.test(form.phone)) return "Phone must be 10 digits";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return "Valid email is required";
    if (!form.business_name.trim()) return "Business name is required";
    if (form.business_name.length > 1000) return "Business name too long";
    if (form.fb_link && !/^https?:\/\/.+/.test(form.fb_link)) return "Facebook link must be a valid URL";
    if (form.instagram_link && !/^https?:\/\/.+/.test(form.instagram_link)) return "Instagram link must be a valid URL";
    if (form.gst_number && !/^[0-9A-Z]{15}$/i.test(form.gst_number)) return "GST must be 15 characters";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('vendor_applications').insert({
        user_id: customerId,
        name: form.name,
        phone: form.phone,
        secondary_phone: form.secondary_phone,
        email: form.email,
        state: form.state,
        city: form.city,
        fb_link: form.fb_link,
        instagram_link: form.instagram_link,
        business_name: form.business_name,
        business_type: form.business_type,
        store_name: form.store_name,
        category: form.category,
        business_description: form.business_description,
        gst_number: form.gst_number,
        pan_number: form.pan_number,
        aadhaar_number: form.aadhaar_number,
        status: 'submitted',
      });

      if (error) throw error;
      toast.success("Vendor application submitted! Our team will review and get back to you within 48 hours.");
      navigate("/app/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    }
    setLoading(false);
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">Become a Seller</h1>
        </div>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Store className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Start Selling on Planext4U</h3>
              <p className="text-xs text-muted-foreground mt-1">Fill in your details below. Our team will review your application and activate your vendor account.</p>
            </div>
          </div>
        </Card>

        {/* Personal Details */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Full Name" maxLength={100} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone *</label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit phone" maxLength={10} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Secondary Phone</label>
              <Input value={form.secondary_phone} onChange={e => updateField('secondary_phone', e.target.value.replace(/\D/g, ''))} placeholder="Optional" maxLength={10} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email *</label>
              <Input value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="Email" type="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Input value={form.state} onChange={e => updateField('state', e.target.value)} placeholder="State" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="City" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Facebook Link</label>
              <Input value={form.fb_link} onChange={e => updateField('fb_link', e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instagram Link</label>
              <Input value={form.instagram_link} onChange={e => updateField('instagram_link', e.target.value)} placeholder="https://instagram.com/..." />
            </div>
          </div>
        </Card>

        {/* Business Details */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Business Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Business Name *</label>
              <Input value={form.business_name} onChange={e => updateField('business_name', e.target.value)} placeholder="Business Name" maxLength={1000} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Business Type</label>
              <Select value={form.business_type} onValueChange={v => updateField('business_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprietorship">Proprietorship</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="pvt_ltd">Pvt Ltd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={form.category} onValueChange={v => updateField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product Seller</SelectItem>
                  <SelectItem value="service">Service Provider</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Store Name</label>
              <Input value={form.store_name} onChange={e => updateField('store_name', e.target.value)} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Business Description</label>
              <Textarea value={form.business_description} onChange={e => updateField('business_description', e.target.value)} placeholder="Describe your business..." maxLength={2000} rows={3} />
            </div>
          </div>
        </Card>

        {/* KYC Documents */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">KYC Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">GST Number</label>
              <Input value={form.gst_number} onChange={e => updateField('gst_number', e.target.value.toUpperCase())} placeholder="15 character GST" maxLength={15} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">PAN Number</label>
              <Input value={form.pan_number} onChange={e => updateField('pan_number', e.target.value.toUpperCase())} placeholder="10 character PAN" maxLength={10} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Aadhaar Number</label>
              <Input value={form.aadhaar_number} onChange={e => updateField('aadhaar_number', e.target.value.replace(/\D/g, ''))} placeholder="12 digit Aadhaar" maxLength={12} />
            </div>
          </div>
        </Card>

        <Button className="w-full h-12" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Submit Application
        </Button>
      </div>
    </CustomerLayout>
  );
}
