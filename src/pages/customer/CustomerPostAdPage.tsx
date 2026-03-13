import { useState, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Camera, X, Loader2 } from "lucide-react";

export default function CustomerPostAdPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "", city: "Mumbai", area: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = api.getClassifiedCategories().map(c => typeof c === 'string' ? c : c.name);

  // Redirect if not logged in
  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-6">You need to be logged in to post a classified ad.</p>
          <Button onClick={() => navigate("/app/login")}>Login to Continue</Button>
        </div>
      </CustomerLayout>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setUploading(true);
    try {
      const userId = customerUser.id;
      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit`);
          continue;
        }

        const ext = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from('classified-images')
          .upload(fileName, file, { contentType: file.type });

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('classified-images')
          .getPublicUrl(fileName);

        newImages.push(urlData.publicUrl);
      }

      setImages(prev => [...prev, ...newImages]);
      if (newImages.length > 0) toast.success(`${newImages.length} image(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.category || !form.area) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.postClassifiedAd({ ...form, price: Number(form.price), images });
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
            {/* Image Upload */}
            <div>
              <Label>Photos (up to 5)</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border/50">
                    <img src={img} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    <span className="text-[10px]">{uploading ? "Uploading" : "Add"}</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>

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
            <Button type="submit" className="w-full" disabled={loading || uploading}>
              {loading ? "Posting..." : "Post Ad"}
            </Button>
          </form>
        </Card>
      </div>
    </CustomerLayout>
  );
}
