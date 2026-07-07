import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Upload, X, Camera, Image as ImageIcon, Download, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductVariant } from "@/lib/api";

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
  const [parentFocused, setParentFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"images" | "thumbnail" | "banner">("images");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [activeFormTab, setActiveFormTab] = useState("general");

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

  // Fetch product attributes and their values
  const { data: attributes } = useQuery({
    queryKey: ["productAttributes"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attributes").select("*").eq("is_active", true).order("sort_order");
      return (data || []) as any[];
    },
  });

  const { data: attributeValues } = useQuery({
    queryKey: ["productAttributeValues"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attribute_values").select("*").order("sort_order");
      return (data || []) as any[];
    },
  });

  // Fetch variants when editing
  const { data: dbVariants } = useQuery({
    queryKey: ["productVariants", editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data } = await supabase.from("product_variants").select("*").eq("product_id", editingId).order("sort_order");
      return (data || []) as any[];
    },
    enabled: !!editingId && modalOpen,
  });

  const isColorAttr = (name: string) => name.toLowerCase() === "color" || name.toLowerCase() === "colour";

  const toggleAttribute = (attrId: string, attrName: string, value: string) => {
    const existing = [...(form.product_attributes || [])];
    const idx = existing.findIndex((a: any) => a.attribute_id === attrId);
    if (idx >= 0) {
      const vals = existing[idx].values as string[];
      if (vals.includes(value)) {
        existing[idx] = { ...existing[idx], values: vals.filter((v: string) => v !== value) };
        if (existing[idx].values.length === 0) existing.splice(idx, 1);
      } else {
        existing[idx] = { ...existing[idx], values: [...vals, value] };
      }
    } else {
      existing.push({ attribute_id: attrId, attribute_name: attrName, values: [value] });
    }
    setForm({ ...form, product_attributes: existing });
  };

  const getSelectedValues = (attrId: string): string[] => {
    const attr = (form.product_attributes || []).find((a: any) => a.attribute_id === attrId);
    return attr?.values || [];
  };

  const generateVariants = () => {
    const selectedAttrs = (form.product_attributes || []).filter((a: any) => a.values?.length > 0);
    if (selectedAttrs.length === 0) { toast.error("Select attribute values first"); return; }
    const combos: Record<string, string>[] = [{}];
    for (const attr of selectedAttrs) {
      const newCombos: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const val of attr.values) {
          newCombos.push({ ...combo, [attr.attribute_name]: val });
        }
      }
      combos.length = 0;
      combos.push(...newCombos);
    }
    const price = parseFloat(form.price) || 0;
    const stock = parseInt(form.stock) || 0;
    const newVariants: ProductVariant[] = combos.map((combo, i) => {
      const existing = variants.find(v => JSON.stringify(v.variant_attributes) === JSON.stringify(combo));
      if (existing) return existing;
      const label = Object.values(combo).join("-").replace(/\s+/g, "-").toUpperCase();
      return {
        id: `temp-${Date.now()}-${i}`,
        product_id: editingId || "",
        sku: form.sku ? `${form.sku}-${label}` : "",
        price,
        compare_at_price: price,
        stock_quantity: stock,
        stock_status: "in_stock",
        variant_attributes: combo,
        image_url: "",
        is_active: true,
        sort_order: i,
      };
    });
    setVariants(newVariants);
    toast.success(`${newVariants.length} variants generated`);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    const updated = [...variants];
    (updated[idx] as any)[field] = value;
    setVariants(updated);
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const uploadImage = async (file: File, target: "images" | "thumbnail" | "banner") => {
    setUploading(true);
    try {
      const { uploadToB2 } = await import("@/lib/b2-upload");
      const { blob, contentType } = await compressToWebP(file);
      const { publicUrl: url } = await uploadToB2(blob, {
        folder: `vendor-assets/${vendorId}/products`,
        filename: `${target}.webp`,
        contentType,
      });

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

  const validateProductForm = (f: ProductForm): string | null => {
    if (!f.title.trim()) return "Product title is required";
    if (!f.sku?.trim()) return "SKU is required";
    if (!f.category_id) return "Category is required";
    if (!f.short_description?.trim()) return "Short Description is required";
    if (!f.long_description?.trim()) return "Long Description is required";
    if (!f.price || parseFloat(f.price) <= 0) return "MRP / Price must be greater than 0";
    if (!f.stock || parseInt(f.stock) < 0) return "Stock quantity is required";
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductForm) => {
      const err = validateProductForm(formData);
      if (err) throw new Error(err);
      const payload: any = {
        title: formData.title,
        description: formData.description || formData.short_description || formData.long_description || formData.title || "",
        short_description: formData.short_description || "",
        long_description: formData.long_description || "",
        price: parseFloat(formData.price) || 0, tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0, discount_type: formData.discount_type || "fixed",
        stock: parseInt(formData.stock) || 0,
        category_id: formData.category_id || null,
        category_name: categories?.find(c => c.id === formData.category_id)?.name || "",
        subcategory_id: formData.subcategory_id || null,
        subcategory_name: subcategories?.find(c => c.id === formData.subcategory_id)?.name || "",
        emoji: formData.emoji || "📦",
        status: editingId ? formData.status : 'pending_approval',
        vendor_id: vendorId, vendor_name: vendorUser?.name || "",
        image: formData.image || formData.images[0] || null,
        images: formData.images || [],
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

      // Hard guard: if vendor_id is the placeholder fallback, the RLS check will reject the insert silently.
      if (!vendorUser?.vendor_id) {
        throw new Error("Your login is not linked to a vendor account. Please re-login or contact admin to fix the vendor mapping before adding products.");
      }
      let productId = editingId;
      if (editingId) {
        const { data: updated, error } = await supabase.from("products").update(payload).eq("id", editingId).select();
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error("Update blocked — your vendor account is not linked to this product. Contact admin.");
        }
      } else {
        productId = `PRD-${Date.now().toString(36).toUpperCase()}`;
        const { data: inserted, error } = await supabase.from("products").insert({ ...payload, id: productId }).select();
        if (error) throw error;
        if (!inserted || inserted.length === 0) {
          throw new Error("Save blocked by access policy — your vendor account is not properly linked. Please contact admin to fix the login mapping before adding products.");
        }
      }
      // Save variants for variable products
      if (formData.product_type === "variable" && productId) {
        await supabase.from("product_variants").delete().eq("product_id", productId);
        for (const v of variants) {
          await supabase.from("product_variants").insert({
            product_id: productId,
            sku: v.sku || null,
            price: v.price,
            compare_at_price: v.compare_at_price || 0,
            stock_quantity: v.stock_quantity,
            stock_status: v.stock_status,
            variant_attributes: v.variant_attributes,
            image_url: v.image_url || "",
            is_active: v.is_active,
            sort_order: v.sort_order || 0,
          } as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorProducts"] });
      qc.invalidateQueries({ queryKey: ["productVariants"] });
      setModalOpen(false); setEditingId(null); setForm(emptyForm); setVariants([]);
      setActiveFormTab("general");
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
    setVariants([]);
    setActiveFormTab("general");
    setModalOpen(true);
  };

  // Load variants when dbVariants change
  useMemo(() => {
    if (dbVariants && dbVariants.length > 0) setVariants(dbVariants);
  }, [dbVariants]);

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
                  {p.image ? <img loading="lazy" decoding="async" src={p.image} alt="" className="w-full h-full object-cover" /> : <span>{p.emoji || "📦"}</span>}
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
      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) { setVariants([]); setActiveFormTab("general"); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>{editingId ? "Update your product details." : "New products will be submitted for admin approval."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
            <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
                <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
                {form.product_type === "variable" && <TabsTrigger value="variants" className="flex-1">Variants ({variants.length})</TabsTrigger>}
              </TabsList>

              {/* GENERAL TAB */}
              <TabsContent value="general" className="space-y-4 mt-3">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-3">
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

                {/* Parent Item */}
                <div>
                  <Label>Parent Item (optional)</Label>
                  {form.parent_item_id ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 mt-1">
                      <span className="text-sm flex-1">{form.parent_item_name || form.parent_item_id}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, parent_item_id: "", parent_item_name: "" })}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <Input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        onFocus={() => setParentFocused(true)}
                        onBlur={() => setTimeout(() => setParentFocused(false), 200)}
                        placeholder="Type to search parent items..."
                      />
                      {parentFocused && parentItems && parentItems.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {parentItems.map((pi: any) => (
                            <button key={pi.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setForm({ ...form, parent_item_id: pi.id, parent_item_name: pi.name }); setParentSearch(""); setParentFocused(false); }}>
                              <span className="font-mono text-xs text-muted-foreground">{pi.id}</span> — <span className="font-medium">{pi.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {parentFocused && parentItems && parentItems.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-3 text-xs text-muted-foreground">
                          No parent items found{parentSearch ? ` for "${parentSearch}"` : ""}. Ask admin to add parent items.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Images */}
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
                          <img loading="lazy" decoding="async" src={img} alt="" className="w-full h-full object-cover" />
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
                        <img loading="lazy" decoding="async" src={form.thumbnail_image} alt="" className="w-full h-full object-cover" />
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
                        <img loading="lazy" decoding="async" src={form.banner_image} alt="" className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-card/80 flex items-center justify-center" onClick={() => setForm({ ...form, banner_image: "" })}><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="mt-1 gap-1" onClick={() => triggerUpload("banner")} disabled={uploading}>
                        <ImageIcon className="h-3 w-3" /> Upload
                      </Button>
                    )}
                  </div>
                </div>

                <div><Label>Short Description *</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="Brief one-liner" /></div>
                <div><Label>Description *</Label><RichTextEditor value={form.long_description || form.description} onChange={(v) => setForm({ ...form, long_description: v, description: v })} placeholder="Detailed product description..." minHeight="120px" /></div>

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
              </TabsContent>

              {/* PRICING TAB */}
              <TabsContent value="pricing" className="space-y-4 mt-3">
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
                {form.product_type !== "variable" && (
                  <div><Label>Stock *</Label><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
                )}
                {form.product_type === "variable" && (
                  <p className="text-xs text-muted-foreground p-3 bg-secondary/20 rounded-lg">
                    💡 For variable products, price and stock are managed per variant in the Variants tab. The base price above is used as default for new variants.
                  </p>
                )}
              </TabsContent>

              {/* ATTRIBUTES TAB */}
              <TabsContent value="attributes" className="space-y-4 mt-3">
                {(attributes || []).length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Select attribute values for this product. {form.product_type === "variable" ? "Variants will be generated from selected combinations." : ""}</p>
                    {(attributes || []).map((attr: any) => {
                      const vals = (attributeValues || []).filter((v: any) => v.attribute_id === attr.id);
                      const selected = getSelectedValues(attr.id);
                      const isColor = isColorAttr(attr.name);

                      if (attr.attribute_type === "text") {
                        const textVal = selected[0] || "";
                        return (
                          <div key={attr.id}>
                            <Label className="text-xs text-muted-foreground">{attr.name}</Label>
                            <Input value={textVal} onChange={(e) => {
                              const existing = [...(form.product_attributes || [])];
                              const idx = existing.findIndex((a: any) => a.attribute_id === attr.id);
                              if (idx >= 0) existing[idx] = { ...existing[idx], values: [e.target.value] };
                              else existing.push({ attribute_id: attr.id, attribute_name: attr.name, values: [e.target.value] });
                              setForm({ ...form, product_attributes: existing });
                            }} className="mt-1" placeholder={`Enter ${attr.name}`} />
                          </div>
                        );
                      }

                      return (
                        <div key={attr.id}>
                          <Label className="text-xs text-muted-foreground">{attr.name}</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {vals.map((v: any) => {
                              const isSelected = selected.includes(v.value);
                              if (isColor && v.hex_color) {
                                return (
                                  <button key={v.id} type="button" onClick={() => toggleAttribute(attr.id, attr.name, v.value)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border hover:border-primary/30'}`}
                                    title={v.value}>
                                    <span className="h-5 w-5 rounded-full border-2 shrink-0" style={{
                                      backgroundColor: v.hex_color,
                                      borderColor: isSelected ? 'hsl(var(--primary))' : v.hex_color === '#FFFFFF' ? '#ddd' : v.hex_color
                                    }} />
                                    <span className="font-medium">{v.value}</span>
                                  </button>
                                );
                              }
                              return (
                                <button key={v.id} type="button" onClick={() => toggleAttribute(attr.id, attr.name, v.value)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                                  {v.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {form.product_type === "variable" && (
                      <Button type="button" onClick={generateVariants} className="gap-1">
                        <Layers className="h-4 w-4" /> Generate Variants from Selection
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">No attributes configured yet. Contact admin to add product attributes.</p>
                )}
              </TabsContent>

              {/* VARIANTS TAB */}
              {form.product_type === "variable" && (
                <TabsContent value="variants" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{variants.length} variant(s)</p>
                    <Button type="button" size="sm" variant="outline" onClick={generateVariants} className="gap-1">
                      <Plus className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                  {variants.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-lg">
                      <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No variants yet. Go to Attributes tab, select values, then generate.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {variants.map((v, i) => {
                        const label = Object.entries(v.variant_attributes).map(([k, val]) => `${k}: ${val}`).join(" • ");
                        const colorVal = v.variant_attributes["Color"] || v.variant_attributes["Colour"];
                        const hexColor = colorVal ? (attributeValues || []).find((av: any) => av.value === colorVal)?.hex_color : null;
                        return (
                          <div key={v.id} className="p-3 border border-border/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {hexColor && <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: hexColor }} />}
                                <span className="text-xs font-semibold">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch checked={v.is_active} onCheckedChange={(checked) => updateVariant(i, "is_active", checked)} />
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVariant(i)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">SKU</Label>
                                <Input value={v.sku || ""} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Price (₹)</Label>
                                <Input type="number" value={v.price} onChange={(e) => updateVariant(i, "price", Number(e.target.value))} className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Compare Price</Label>
                                <Input type="number" value={v.compare_at_price || ""} onChange={(e) => updateVariant(i, "compare_at_price", Number(e.target.value))} className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Stock</Label>
                                <Input type="number" value={v.stock_quantity} onChange={(e) => updateVariant(i, "stock_quantity", Number(e.target.value))} className="h-7 text-xs" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>

            <Button type="submit" className="w-full mt-4" disabled={saveMutation.isPending}>
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
