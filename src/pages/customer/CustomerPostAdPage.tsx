import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CustomerPostAdPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "", city: "Mumbai", area: "" });

  const categories = api.getClassifiedCategories().map(c => typeof c === 'string' ? c : c.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.category || !form.area) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.postClassifiedAd({ ...form, price: Number(form.price) });
      toast.success("Ad posted successfully! It will be reviewed by admin.");
      navigate("/app/classifieds");
    } catch {
      toast.error("Failed to post ad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <h1 className="text-xl font-bold mb-6">Post a Classified Ad</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Title *</Label>
              <Input placeholder="What are you selling?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" maxLength={100} />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea placeholder="Describe your item — condition, features, etc." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={4} maxLength={1000} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹) *</Label>
                <Input type="number" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Area *</Label>
                <Input placeholder="e.g., Andheri" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Your ad will be reviewed by admin before publishing. This usually takes 24 hours.</p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Posting..." : "Post Ad"}
            </Button>
          </form>
        </Card>
      </div>
    </CustomerLayout>
  );
}
