import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success", inactive: "bg-destructive/10 text-destructive", draft: "bg-muted text-muted-foreground",
};

interface ProductForm {
  title: string; description: string; price: string; tax: string; discount: string;
  stock: string; category_id: string; emoji: string; status: string;
  image: string; sku: string; images: string[]; youtube_video_url: string;
}

const emptyForm: ProductForm = {
  title: "", description: "", price: "", tax: "", discount: "0",
  stock: "", category_id: "", emoji: "📦", status: "draft",
  image: "", sku: "", images: [], youtube_video_url: "",
};

export default function VendorProductsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendorProducts", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("vendor_id", vendorId);
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("status", "active");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductForm) => {
      const payload: any = {
        title: formData.title, description: formData.description,
        price: parseFloat(formData.price) || 0, tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0, stock: parseInt(formData.stock) || 0,
        category_id: formData.category_id || null,
        category_name: categories?.find(c => c.id === formData.category_id)?.name || "",
        emoji: formData.emoji, status: formData.status,
        vendor_id: vendorId, vendor_name: vendorUser?.name || "",
        image: formData.image || formData.images[0] || null,
        youtube_video_url: formData.youtube_video_url || "",
      };
      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const id = `PRD-${Date.now().toString(36).toUpperCase()}`;
        const { error } = await supabase.from("products").insert({ ...payload, id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorProducts"] });
      setModalOpen(false); setEditingId(null); setForm(emptyForm);
      toast.success(editingId ? "Product updated" : "Product created for approval");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorProducts"] }); toast.success("Product deleted"); },
  });

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title, description: p.description, price: String(p.price), tax: String(p.tax),
      discount: String(p.discount), stock: String(p.stock || 0), category_id: p.category_id || "",
      emoji: p.emoji || "📦", status: p.status, image: p.image || "", sku: "", images: p.image ? [p.image] : [],
      youtube_video_url: p.youtube_video_url || "",
    });
    setModalOpen(true);
  };

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setForm({ ...form, images: [...form.images, newImageUrl.trim()], image: form.image || newImageUrl.trim() });
      setNewImageUrl("");
    }
  };

  const removeImage = (idx: number) => {
    const updated = form.images.filter((_, i) => i !== idx);
    setForm({ ...form, images: updated, image: updated[0] || "" });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV must have header + data rows"); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ""; });
        const id = `PRD-${Date.now().toString(36).toUpperCase()}${i}`;
        await supabase.from("products").insert({
          id, vendor_id: vendorId, vendor_name: vendorUser?.name || "",
          title: row.title || row.name || `Product ${i}`,
          description: row.description || "", price: parseFloat(row.price) || 0,
          tax: parseFloat(row.tax) || 0, discount: parseFloat(row.discount) || 0,
          stock: parseInt(row.stock) || 0, status: "draft", emoji: row.emoji || "📦",
          image: row.image || null,
        });
        count++;
      }
      toast.success(`${count} products imported! They'll appear after admin approval.`);
      qc.invalidateQueries({ queryKey: ["vendorProducts"] });
      setShowCsvDialog(false);
    };
    reader.readAsText(file);
  };

  const clearFilters = () => { setSearch(""); setStatusFilter(""); };

  const filtered = products?.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  }) || [];

  return (
    <VendorLayout title={`My Products (${filtered.length})`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter) && <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>Clear</Button>}
          <Button variant="outline" onClick={() => setShowCsvDialog(true)}><Upload className="h-4 w-4 mr-1" /> CSV</Button>
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
        </div>

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            filtered.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">No products yet. Click "Add Product" to get started!</p></Card>
            ) :
            filtered.map((p) => (
              <Card key={p.id} className="p-4 flex items-center gap-4">
                <div className="h-14 w-14 bg-secondary/30 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <span>{p.emoji || "📦"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{p.title}</h3>
                    <Badge className={`${statusStyle[p.status] || ''} border-0 text-[10px]`}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>₹{Number(p.price).toLocaleString()}</span>
                    <span>Stock: {p.stock ?? 0}</span>
                    <span>{p.sales ?? 0} sold</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
        </div>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>{editingId ? "Update your product details." : "New products will be submitted for admin approval."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            
            {/* Image Upload */}
            <div>
              <Label>Product Images</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Paste image URL" className="flex-1" />
                <Button type="button" size="sm" onClick={addImageUrl}>Add</Button>
              </div>
              {form.images.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-secondary/30">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-card/80 flex items-center justify-center" onClick={() => removeImage(i)}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div><Label>Tax (₹)</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount (₹)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Emoji Icon</Label><Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="📦" /></div>
            <div>
              <Label>YouTube Video URL</Label>
              <Input value={form.youtube_video_url} onChange={(e) => setForm({ ...form, youtube_video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update Product" : "Submit for Approval"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Upload a CSV file with columns: title, description, price, tax, discount, stock, emoji, image</p>
            <Input type="file" accept=".csv" onChange={handleCsvUpload} />
            <Button variant="outline" className="w-full" onClick={() => {
              const csv = "title,description,price,tax,discount,stock,emoji,image\nSample Product,A great product,999,50,0,100,📦,";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "product-template.csv"; a.click();
            }}>Download Template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
