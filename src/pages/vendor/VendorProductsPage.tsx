import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Upload, X, Camera, Image as ImageIcon, Download } from "lucide-react";
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
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success", inactive: "bg-destructive/10 text-destructive", draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
};

interface ProductForm {
  title: string; description: string; short_description: string; long_description: string;
  price: string; tax: string; discount: string; discount_type: string;
  stock: string; category_id: string; subcategory_id: string; emoji: string; status: string;
  image: string; sku: string; images: string[]; youtube_video_url: string;
  inactivation_reason: string; tax_slab_id: string; product_attributes: any[];
  product_type: string; slug: string; meta_title: string; meta_description: string;
  parent_item_id: string; parent_item_name: string;
  thumbnail_image: string; banner_image: string;
}

const emptyForm: ProductForm = {
  title: "", description: "", short_description: "", long_description: "",
  price: "", tax: "", discount: "0", discount_type: "fixed",
  stock: "", category_id: "", subcategory_id: "", emoji: "📦", status: "draft",
  image: "", sku: "", images: [], youtube_video_url: "",
  inactivation_reason: "", tax_slab_id: "", product_attributes: [],
  product_type: "simple", slug: "", meta_title: "", meta_description: "",
  parent_item_id: "", parent_item_name: "",
  thumbnail_image: "", banner_image: "",
};

const EMOJI_LIST = ["📦","🛒","👕","👗","👟","🎒","💻","📱","🎧","🍕","🍔","🥗","🍎","🥤","🧴","💄","🧸","📚","🎮","⌚","💍","🏠","🔧","🎨","🌿","🧹","🍫","🎂","🥩","🧀","🥛","🍺","🍷","☕","🫖","🧊","🪥","🧻","💡","🔌","🖥️","🖨️","📷","🎵","🎸","⚽","🏋️","🚲","🛵","✈️"];

export default function VendorProductsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"images" | "thumbnail" | "banner">("images");

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
      const { data } = await supabase.from("categories").select("*").eq("status", "active").is("parent_id", null);
      return data || [];
    },
  });

  const { data: subcategories } = useQuery({
    queryKey: ["subcategories", form.category_id],
    queryFn: async () => {
      if (!form.category_id) return [];
      const { data } = await supabase.from("categories").select("*").eq("parent_id", form.category_id).eq("status", "active");
      return data || [];
    },
    enabled: !!form.category_id,
  });

  const { data: parentItems } = useQuery({
    queryKey: ["parentItems", parentSearch],
    queryFn: async () => {
      let q = supabase.from("parent_items").select("*").eq("status", "active").limit(20);
      if (parentSearch) q = q.ilike("name", `%${parentSearch}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const uploadImage = async (file: File, target: "images" | "thumbnail" | "banner") => {
    setUploading(true);
    try {
      const { blob, contentType } = await compressToWebP(file);
      const path = `${vendorId}/products/${Date.now()}-${target}.webp`;
      const { error } = await supabase.storage.from("vendor-assets").upload(path, blob, { contentType, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(path);
      const url = urlData?.publicUrl || "";

      if (target === "images") {
        setForm(f => ({ ...f, images: [...f.images, url], image: f.image || url }));
      } else if (target === "thumbnail") {
        setForm(f => ({ ...f, thumbnail_image: url }));
      } else {
        setForm(f => ({ ...f, banner_image: url }));
      }
      toast.success("Image uploaded ✓");
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, uploadTarget);
    if (e.target) e.target.value = "";
  };

  const triggerUpload = (target: "images" | "thumbnail" | "banner") => {
    setUploadTarget(target);
    requestAnimationFrame(() => fileRef.current?.click());
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductForm) => {
      const payload: any = {
        title: formData.title, description: formData.description,
        short_description: formData.short_description, long_description: formData.long_description,
        price: parseFloat(formData.price) || 0, tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0, discount_type: formData.discount_type,
        stock: parseInt(formData.stock) || 0,
        category_id: formData.category_id || null,
        category_name: categories?.find(c => c.id === formData.category_id)?.name || "",
        subcategory_id: formData.subcategory_id || null,
        subcategory_name: subcategories?.find(c => c.id === formData.subcategory_id)?.name || "",
        emoji: formData.emoji, status: editingId ? formData.status : 'pending_approval',
        vendor_id: vendorId, vendor_name: vendorUser?.name || "",
        image: formData.image || formData.images[0] || null,
        images: formData.images,
        thumbnail_image: formData.thumbnail_image || null,
        banner_image: formData.banner_image || null,
        youtube_video_url: formData.youtube_video_url || "",
        inactivation_reason: formData.inactivation_reason || "",
        tax_slab_id: formData.tax_slab_id || null,
        product_attributes: formData.product_attributes || [],
        product_type: formData.product_type || "simple",
        sku: formData.sku || null,
        slug: formData.slug || null,
        meta_title: formData.meta_title || "",
        meta_description: formData.meta_description || "",
        parent_item_id: formData.parent_item_id || null,
        parent_item_name: formData.parent_item_name || null,
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
      title: p.title, description: p.description,
      short_description: p.short_description || "", long_description: p.long_description || "",
      price: String(p.price), tax: String(p.tax),
      discount: String(p.discount), discount_type: p.discount_type || "fixed",
      stock: String(p.stock || 0), category_id: p.category_id || "",
      subcategory_id: p.subcategory_id || "",
      emoji: p.emoji || "📦", status: p.status, image: p.image || "", sku: p.sku || "",
      images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
      youtube_video_url: p.youtube_video_url || "",
      inactivation_reason: p.inactivation_reason || "",
      tax_slab_id: p.tax_slab_id || "",
      product_attributes: p.product_attributes || [],
      product_type: p.product_type || "simple",
      slug: p.slug || "", meta_title: p.meta_title || "", meta_description: p.meta_description || "",
      parent_item_id: p.parent_item_id || "", parent_item_name: p.parent_item_name || "",
      thumbnail_image: p.thumbnail_image || "", banner_image: p.banner_image || "",
    });
    setModalOpen(true);
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
      let count = 0; let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ""; });
        if (!row.title && !row.name) { errors++; continue; }
        const id = `PRD-${Date.now().toString(36).toUpperCase()}${i}`;
        const { error } = await supabase.from("products").insert({
          id, vendor_id: vendorId, vendor_name: vendorUser?.name || "",
          title: row.title || row.name || `Product ${i}`,
          description: row.description || "", price: parseFloat(row.price) || 0,
          tax: parseFloat(row.tax) || 0, discount: parseFloat(row.discount) || 0,
          stock: parseInt(row.stock) || 0, status: "draft", emoji: row.emoji || "📦",
          image: row.image || null, sku: row.sku || null,
          category_id: row.category_id || null, category_name: row.category || "",
        });
        if (error) { errors++; } else { count++; }
      }
      toast.success(`${count} products imported${errors ? `, ${errors} failed` : ""}!`);
      qc.invalidateQueries({ queryKey: ["vendorProducts"] });
      setShowCsvDialog(false);
    };
    reader.readAsText(file);
  };

  const clearFilters = () => { setSearch(""); setStatusFilter(""); };

  const filtered = products?.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  }) || [];

  return (
    <VendorLayout title={`My Products (${filtered.length})`}>
      <input type="file" ref={fileRef} className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} />
      <div className="max-w-5xl mx-auto px-4 py-6 overflow-x-hidden">
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
              <Card className="p-8 text-center"><p className="text-muted-foreground">No products found. {!search && !statusFilter ? 'Click "Add Product" to get started!' : 'Try clearing filters.'}</p></Card>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>{editingId ? "Update your product details." : "New products will be submitted for admin approval."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SKU-001" /></div>
            
            <div><Label>Product Type</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="variable">Variable (has variants)</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subcategory</Label>
                <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })} disabled={!form.category_id}>
                  <SelectTrigger><SelectValue placeholder={form.category_id ? "Select subcategory" : "Select category first"} /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">{subcategories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Parent Item Autocomplete */}
            <div>
              <Label>Parent Item (optional)</Label>
              {form.parent_item_id ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 mt-1">
                  <span className="text-sm flex-1">{form.parent_item_name || form.parent_item_id}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, parent_item_id: "", parent_item_name: "" })}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} placeholder="Type to search parent items..." />
                  {parentSearch && parentItems && parentItems.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {parentItems.map((pi: any) => (
                        <button key={pi.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50"
                          onClick={() => { setForm({ ...form, parent_item_id: pi.id, parent_item_name: `${pi.id} - ${pi.name}` }); setParentSearch(""); }}>
                          {pi.id} - {pi.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Image Upload from Camera/Browse */}
            <div>
              <Label>Product Images</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("images")} disabled={uploading} className="gap-1">
                  <Camera className="h-3 w-3" /> {uploading ? "Uploading..." : "Upload Image"}
                </Button>
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

            {/* Thumbnail & Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Thumbnail</Label>
                {form.thumbnail_image ? (
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-secondary/30 mt-1">
                    <img src={form.thumbnail_image} alt="" className="w-full h-full object-cover" />
                    <button type="button" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-card/80 flex items-center justify-center" onClick={() => setForm({ ...form, thumbnail_image: "" })}><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="mt-1 gap-1" onClick={() => triggerUpload("thumbnail")} disabled={uploading}>
                    <ImageIcon className="h-3 w-3" /> Upload
                  </Button>
                )}
              </div>
              <div>
                <Label>Banner</Label>
                {form.banner_image ? (
                  <div className="relative h-20 w-32 rounded-lg overflow-hidden bg-secondary/30 mt-1">
                    <img src={form.banner_image} alt="" className="w-full h-full object-cover" />
                    <button type="button" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-card/80 flex items-center justify-center" onClick={() => setForm({ ...form, banner_image: "" })}><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="mt-1 gap-1" onClick={() => triggerUpload("banner")} disabled={uploading}>
                    <ImageIcon className="h-3 w-3" /> Upload
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div><Label>Tax (₹)</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
              <div><Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed (₹)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>

            {/* Emoji Picker */}
            <div>
              <Label>Emoji Icon</Label>
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="h-10 w-10 rounded-lg border border-input flex items-center justify-center text-xl hover:bg-accent/50">
                  {form.emoji}
                </button>
                <span className="text-xs text-muted-foreground">Click to change</span>
              </div>
              {showEmojiPicker && (
                <div className="grid grid-cols-10 gap-1 mt-2 p-2 border border-border rounded-lg bg-card max-h-32 overflow-y-auto">
                  {EMOJI_LIST.map(em => (
                    <button key={em} type="button" className="h-8 w-8 flex items-center justify-center text-lg hover:bg-accent/50 rounded"
                      onClick={() => { setForm({ ...form, emoji: em }); setShowEmojiPicker(false); }}>
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
            <p className="text-sm text-muted-foreground">Upload a CSV file. Image fields can be left empty and loaded later via Media Library.</p>
            <p className="text-xs text-muted-foreground">Required columns: <strong>title, price</strong><br/>Optional: description, tax, discount, stock, emoji, image, sku, category</p>
            <Input type="file" accept=".csv" onChange={handleCsvUpload} />
            <Button variant="outline" className="w-full gap-1" onClick={() => {
              const csv = "title,description,price,tax,discount,stock,sku,emoji,category,image\nSample Product,A great product,999,50,0,100,SKU-001,📦,,\nAnother Product,Description here,1499,75,100,50,SKU-002,👕,,";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "product-upload-template.csv"; a.click();
            }}><Download className="h-4 w-4" /> Download Sample Template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
