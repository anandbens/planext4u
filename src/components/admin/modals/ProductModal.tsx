import { Product, ProductVariant } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Store, Tag, Star, DollarSign, Trash2, ImageIcon, Youtube, X, Clock, Phone, Shield, ToggleLeft, Plus, Layers, Search, MapPin, RotateCcw } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCountry } from "@/lib/country-context";

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Product>) => Promise<void>;
  onCreate?: (data: Partial<Product>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isVendor?: boolean;
  preselectedVendorId?: string;
}

const emptyForm = {
  title: "", description: "", short_description: "", long_description: "",
  price: 0, tax: 0, discount: 0, discount_type: "fixed" as string,
  max_points_redeemable: 0, status: "active" as Product["status"],
  vendor_id: "", vendor_name: "", category_id: "", category_name: "", stock: 0, emoji: "📦",
  image: "", rejection_reason: "", inactivation_reason: "", youtube_video_url: "",
  images: [] as string[], max_redemption_percentage: null as number | null,
  commission_override: null as number | null,
  tax_slab_id: "" as string, product_attributes: [] as any[],
  is_available: true, duration_hours: 0, duration_minutes: 0,
  promise_p4u: "", helpline_number: "",
  thumbnail_image: "", banner_image: "", socio_shopping_icon: "",
  subcategory_id: "", subcategory_name: "",
  product_type: "simple" as 'simple' | 'variable' | 'service',
  sku: "", slug: "", meta_title: "", meta_description: "",
  manage_stock: false, stock_status: "in_stock",
  parent_item_id: "" as string, parent_item_name: "" as string,
  replacement_time: "12 Hours" as string,
  hsn_code: "" as string, sac_code: "" as string,
  is_deal_of_day: false as boolean,
};

export function ProductModal({ product, open, onOpenChange, mode, onSave, onCreate, onDelete, isVendor, preselectedVendorId }: ProductModalProps) {
  const isCreate = mode === "create";
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [activeTab, setActiveTab] = useState("general");

  // Vendor filtering state
  const [vendorState, setVendorState] = useState("");
  const [vendorDistrict, setVendorDistrict] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  const isApproved = !isCreate && product?.status === "active";
  const vendorRestricted = isVendor && isApproved;

  const { data: taxSlabs } = useQuery({
    queryKey: ["taxSlabs"],
    queryFn: async () => {
      const { data } = await supabase.from("tax_slabs" as any).select("*").eq("is_active", true).order("rate");
      return (data || []) as any[];
    },
  });

  // Fetch all vendors with city/state info for filtering
  const { data: allVendors } = useQuery({
    queryKey: ["vendorsWithLocation"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, business_name, mobile, city_id, status")
        .in("status", ["active", "verified"])
        .order("business_name");
      if (!data) return [];
      // Fetch city details for state/district mapping
      const cityIds = [...new Set(data.map((v: any) => v.city_id).filter(Boolean))];
      let cityMap: Record<string, { name: string; state: string }> = {};
      if (cityIds.length > 0) {
        const { data: cities } = await supabase.from("cities").select("id, name, state").in("id", cityIds);
        (cities || []).forEach((c: any) => { cityMap[c.id] = { name: c.name, state: c.state }; });
      }
      return data.map((v: any) => ({
        ...v,
        city_name: cityMap[v.city_id]?.name || "",
        state: cityMap[v.city_id]?.state || "",
      }));
    },
    enabled: !isVendor,
  });

  // Derive unique states and districts
  const vendorStates = useMemo(() => {
    if (!allVendors) return [];
    return [...new Set(allVendors.map((v: any) => v.state).filter(Boolean))].sort();
  }, [allVendors]);

  const vendorDistricts = useMemo(() => {
    if (!allVendors) return [];
    let filtered = allVendors;
    if (vendorState) filtered = filtered.filter((v: any) => v.state === vendorState);
    return [...new Set(filtered.map((v: any) => v.city_name).filter(Boolean))].sort();
  }, [allVendors, vendorState]);

  // Filtered vendors based on state, district, and search
  const filteredVendors = useMemo(() => {
    if (!allVendors) return [];
    let list = allVendors;
    if (vendorState) list = list.filter((v: any) => v.state === vendorState);
    if (vendorDistrict) list = list.filter((v: any) => v.city_name === vendorDistrict);
    if (vendorSearch) {
      const q = vendorSearch.toLowerCase();
      list = list.filter((v: any) =>
        v.business_name?.toLowerCase().includes(q) ||
        v.mobile?.includes(q) ||
        v.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allVendors, vendorState, vendorDistrict, vendorSearch]);

  const { data: attributes } = useQuery({
    queryKey: ["productAttributes"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attributes").select("*").eq("is_active", true).order("sort_order");
      return (data || []) as any[];
    },
  });

  // Parent Items for autocomplete
  const [parentSearch, setParentSearch] = useState("");
  const [parentFocused, setParentFocused] = useState(false);
  const { data: parentItems } = useQuery({
    queryKey: ["parentItems"],
    queryFn: async () => {
      const { data } = await supabase.from("parent_items" as any).select("*").eq("status", "active").order("name");
      return (data || []) as any[];
    },
  });

  const filteredParentItems = useMemo(() => {
    if (!parentItems) return [];
    if (!parentSearch) return parentItems.slice(0, 20);
    const q = parentSearch.toLowerCase();
    return parentItems.filter((p: any) =>
      p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [parentItems, parentSearch]);

  const { data: attributeValues } = useQuery({
    queryKey: ["productAttributeValues"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attribute_values").select("*").order("sort_order");
      return (data || []) as any[];
    },
  });

  const { data: dbVariants } = useQuery({
    queryKey: ["productVariants", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data } = await supabase.from("product_variants").select("*").eq("product_id", product.id).order("sort_order");
      return (data || []) as any[];
    },
    enabled: !!product?.id && open,
  });

  useEffect(() => {
    if (dbVariants) setVariants(dbVariants);
  }, [dbVariants]);

  useEffect(() => {
    if (isCreate) {
      setForm({
        ...emptyForm,
        vendor_id: preselectedVendorId || "",
        vendor_name: preselectedVendorId ? (allVendors?.find((v: any) => v.id === preselectedVendorId)?.business_name || "") : "",
      });
      setVariants([]);
      setEditMode(true);
      setActiveTab("general");
      setVendorState("");
      setVendorDistrict("");
      setVendorSearch("");
    } else if (product) {
      setForm({
        title: product.title, description: product.description,
        short_description: (product as any).short_description || "",
        long_description: (product as any).long_description || "",
        price: product.price, tax: product.tax, discount: product.discount,
        discount_type: (product as any).discount_type || "fixed",
        max_points_redeemable: product.max_points_redeemable, status: product.status,
        vendor_id: product.vendor_id, vendor_name: product.vendor_name || "",
        category_id: product.category_id, category_name: product.category_name || "",
        stock: product.stock || 0, emoji: product.emoji || "📦",
        image: product.image || "", rejection_reason: product.rejection_reason || "",
        inactivation_reason: (product as any).inactivation_reason || "",
        youtube_video_url: (product as any).youtube_video_url || "",
        images: ((product as any).images?.length > 0) ? (product as any).images : (product.image ? [product.image] : []),
        max_redemption_percentage: (product as any).max_redemption_percentage ?? null,
        commission_override: (product as any).commission_override ?? null,
        tax_slab_id: (product as any).tax_slab_id || "",
        product_attributes: (product as any).product_attributes || [],
        is_available: (product as any).is_available !== false,
        duration_hours: (product as any).duration_hours || 0,
        duration_minutes: (product as any).duration_minutes || 0,
        promise_p4u: (product as any).promise_p4u || "",
        helpline_number: (product as any).helpline_number || "",
        thumbnail_image: (product as any).thumbnail_image || "",
        banner_image: (product as any).banner_image || "",
        subcategory_id: (product as any).subcategory_id || "",
        subcategory_name: (product as any).subcategory_name || "",
        product_type: (product as any).product_type || "simple",
        sku: (product as any).sku || "",
        slug: (product as any).slug || "",
        meta_title: (product as any).meta_title || "",
        meta_description: (product as any).meta_description || "",
        manage_stock: (product as any).manage_stock || false,
        stock_status: (product as any).stock_status || "in_stock",
        parent_item_id: (product as any).parent_item_id || "",
        parent_item_name: (product as any).parent_item_name || "",
        socio_shopping_icon: (product as any).socio_shopping_icon || "",
        replacement_time: (product as any).replacement_time || "12 Hours",
        hsn_code: (product as any).hsn_code || "",
        sac_code: (product as any).sac_code || "",
        is_deal_of_day: (product as any).is_deal_of_day === true,
      });
      setEditMode(mode === "edit");
      setActiveTab("general");
    }
  }, [product, mode, preselectedVendorId]);

  const taxRate = taxSlabs?.find((t: any) => t.id === form.tax_slab_id)?.rate || 0;
  const taxAmount = form.tax_slab_id ? Math.round(form.price * taxRate / 100) : form.tax;
  const discountAmount = form.discount_type === "percentage" ? Math.round(form.price * form.discount / 100) : form.discount;
  const sellingPrice = form.price + taxAmount - discountAmount;
  const discountPct = form.discount_type === "percentage" ? form.discount : (form.price > 0 ? Math.round((form.discount / form.price) * 100) : 0);

  const handleSave = async () => {
    // Mandatory field validation
    const errors: string[] = [];
    if (!form.title.trim()) errors.push("Title is required");
    else if (form.title.trim().length < 2) errors.push("Title must be at least 2 characters");
    else if (form.title.length > 200) errors.push("Title must be under 200 characters");
    if (!form.vendor_id) errors.push("Vendor is required");
    if (!form.category_id) errors.push("Category is required");
    if (!form.sku?.trim()) errors.push("SKU is required");
    else if (!/^[A-Za-z0-9_-]{2,50}$/.test(form.sku.trim())) errors.push("SKU must be 2-50 chars (letters, numbers, _ or -)");
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) errors.push("Slug must be lowercase letters/numbers/hyphens only");
    if (!form.short_description?.trim()) errors.push("Short Description is required");
    if (!form.long_description?.trim()) errors.push("Long Description is required");
    if (form.price <= 0) errors.push("MRP / Price must be greater than 0");
    if (form.discount_type === "percentage" && (form.discount < 0 || form.discount > 100)) errors.push("Discount % must be between 0 and 100");
    if (form.discount_type === "fixed" && form.discount > form.price) errors.push("Fixed discount cannot exceed price");
    if (form.hsn_code && !/^\d{4,8}$/.test(form.hsn_code.trim())) errors.push("HSN code must be 4-8 digits");
    if (form.sac_code && !/^\d{4,8}$/.test(form.sac_code.trim())) errors.push("SAC code must be 4-8 digits");
    if (form.youtube_video_url && !/^https?:\/\/.+/.test(form.youtube_video_url)) errors.push("YouTube URL must start with http:// or https://");
    if (form.helpline_number && !/^(?:\+?91|0)?[6-9]\d{9}$/.test(form.helpline_number.replace(/[\s-]/g, ""))) errors.push("Helpline must be a valid 10-digit Indian mobile");
    if (form.manage_stock && (form.stock === null || form.stock === undefined || form.stock < 0)) errors.push("Stock quantity is required when stock management is enabled");
    if (form.max_redemption_percentage !== null && form.max_redemption_percentage !== undefined && (form.max_redemption_percentage < 0 || form.max_redemption_percentage > 100)) errors.push("Max redemption % must be between 0 and 100");
    if (form.commission_override !== null && form.commission_override !== undefined && (form.commission_override < 0 || form.commission_override > 100)) errors.push("Commission override must be between 0 and 100");
    if (form.status === 'rejected' && !form.rejection_reason?.trim()) errors.push("Rejection reason is required");
    if (errors.length > 0) { toast.error(errors[0]); return; }
    setSaving(true);
    try {
      const payload = { ...form, tax: taxAmount };
      if (isCreate) {
        await onCreate?.(payload);
      } else if (product) {
        await onSave?.(product.id, payload);
        if (form.product_type === "variable" && product.id) {
          await supabase.from("product_variants").delete().eq("product_id", product.id);
          for (const v of variants) {
            await supabase.from("product_variants").insert({
              product_id: product.id,
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
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Product save error:", err);
      toast.error(err.message || "Failed to save product");
    } finally { setSaving(false); }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "inactive" && form.status !== "inactive") {
      setShowInactivateDialog(true);
      return;
    }
    setForm({ ...form, status: newStatus as Product["status"] });
  };

  const confirmInactivate = () => {
    if (!form.inactivation_reason.trim()) { toast("Please enter reason for inactivation"); return; }
    setForm({ ...form, status: "inactive" as Product["status"] });
    setShowInactivateDialog(false);
  };

  const handleDelete = async () => {
    if (!product) return;
    setSaving(true);
    try { await onDelete?.(product.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = (allVendors || []).find((v: any) => v.id === vendorId);
    setForm({ ...form, vendor_id: vendorId, vendor_name: vendor?.business_name || "" });
  };

  const { data: dbCategories } = useQuery({
    queryKey: ["categoriesForProduct"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id").is("parent_id", null).eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: dbSubcategories } = useQuery({
    queryKey: ["subcategoriesForProduct", form.category_id],
    queryFn: async () => {
      if (!form.category_id) return [];
      const { data } = await supabase.from("categories").select("id, name").eq("parent_id", form.category_id).eq("status", "active").order("name");
      return data || [];
    },
    enabled: !!form.category_id,
  });

  const handleCategoryChange = (catId: string) => {
    const cat = (dbCategories || []).find((c: any) => c.id === catId);
    setForm({ ...form, category_id: catId, category_name: cat?.name || "", subcategory_id: "", subcategory_name: "" });
  };

  const handleSubcategoryChange = (subId: string) => {
    if (subId === "__none__") {
      setForm({ ...form, subcategory_id: "", subcategory_name: "" });
      return;
    }
    const sub = (dbSubcategories || []).find((s: any) => s.id === subId);
    setForm({ ...form, subcategory_id: subId, subcategory_name: sub?.name || "" });
  };

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

    const newVariants: ProductVariant[] = combos.map((combo, i) => {
      const existing = variants.find(v => JSON.stringify(v.variant_attributes) === JSON.stringify(combo));
      if (existing) return existing;
      const label = Object.values(combo).join(" / ");
      return {
        id: `temp-${Date.now()}-${i}`,
        product_id: product?.id || "",
        sku: form.sku ? `${form.sku}-${label.replace(/\s+/g, "-").toUpperCase()}` : "",
        price: form.price,
        compare_at_price: form.price + discountAmount,
        stock_quantity: form.stock || 0,
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

  const isColorAttr = (name: string) => name.toLowerCase() === "color" || name.toLowerCase() === "colour";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-warning flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{isCreate ? "New Product" : product?.title}</span>
              {!isCreate && product && <p className="text-xs font-normal text-muted-foreground mt-0.5">{product.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && product && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={product.status} />
              <Badge variant="outline" className="text-[10px]">{(product as any).product_type || "simple"}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> {product.category_name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" /> {product.vendor_name}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
            <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
            {form.product_type === "variable" && <TabsTrigger value="variants" className="flex-1">Variants ({variants.length})</TabsTrigger>}
            <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
          </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general" className="space-y-4 mt-3">
            {/* Product Type */}
            <div className="grid grid-cols-3 gap-3">
              {(["simple", "variable", "service"] as const).map(t => (
                <button key={t} disabled={!editMode || vendorRestricted}
                  onClick={() => setForm({ ...form, product_type: t })}
                  className={`p-3 rounded-lg border text-center transition-colors ${form.product_type === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"} ${!editMode ? "opacity-60" : ""}`}>
                  <Layers className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium capitalize">{t}</span>
                </button>
              ))}
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Product Images</Label>
              {editMode ? (
                <div className="flex flex-wrap gap-2">
                  {(form.images || []).map((img: string, i: number) => (
                    <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border/30">
                      <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                      <button className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl text-[10px] px-1" onClick={() => {
                        const imgs = form.images.filter((_: string, j: number) => j !== i);
                        setForm({ ...form, images: imgs, image: imgs[0] || "" });
                      }}>×</button>
                      {i === 0 && <span className="absolute bottom-0 left-0 bg-primary text-primary-foreground text-[8px] px-1">Primary</span>}
                    </div>
                  ))}
                  <MediaLibraryPicker value="" onChange={(url) => {
                    const imgs = [...(form.images || []), url];
                    setForm({ ...form, images: imgs, image: imgs[0] || url });
                  }} folder="product-images" label="+ Add" />
                </div>
              ) : form.images?.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {form.images.map((img: string, i: number) => (
                    <div key={i} className="h-20 w-20 rounded-lg overflow-hidden bg-secondary/20 border border-border/30 shrink-0">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Title *</Label>
                {editMode && !vendorRestricted ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Product name" /> : <p className="text-sm font-medium mt-1">{form.title}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                {editMode && !vendorRestricted ? <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1" placeholder="SKU-001" /> : <p className="text-sm mt-1">{form.sku || "—"}</p>}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/30">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><ToggleLeft className="h-3 w-3" /> Availability</Label>
                </div>
                {editMode ? (
                  <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
                ) : (
                  <Badge variant={form.is_available ? "default" : "secondary"}>{form.is_available ? "Available" : "Unavailable"}</Badge>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/30">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Deal of the Day</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Featured in the homepage "Deals of the Day" section</p>
                </div>
                {editMode && !vendorRestricted ? (
                  <Switch checked={form.is_deal_of_day} onCheckedChange={(v) => setForm({ ...form, is_deal_of_day: v })} />
                ) : (
                  <Badge variant={form.is_deal_of_day ? "default" : "secondary"}>{form.is_deal_of_day ? "Yes" : "No"}</Badge>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Short Description</Label>
                {editMode && !vendorRestricted ? <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="mt-1" placeholder="Brief one-liner" /> : <p className="text-sm mt-1 text-muted-foreground">{form.short_description || "—"}</p>}
              </div>

              {/* Parent Item Autocomplete */}
              {editMode && !vendorRestricted && (
                <div className="col-span-2 p-3 rounded-lg bg-secondary/10 border border-border/30 space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Parent Item (for grouping across vendors)</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      onFocus={() => setParentFocused(true)}
                      onBlur={() => setTimeout(() => setParentFocused(false), 200)}
                      className="pl-8 text-xs"
                      placeholder="Search by Parent ID or Name..."
                    />
                  </div>
                  {parentFocused && filteredParentItems.length > 0 && (
                    <div className="max-h-[160px] overflow-y-auto border rounded-lg bg-background">
                      {filteredParentItems.map((p: any) => (
                        <button key={p.id} type="button" className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 border-b last:border-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setForm({ ...form, parent_item_id: p.id, parent_item_name: p.name }); setParentSearch(""); setParentFocused(false); }}>
                          <span className="font-mono text-muted-foreground">{p.id}</span> — <span className="font-medium">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {parentFocused && filteredParentItems.length === 0 && (
                    <div className="text-xs text-muted-foreground p-2 border rounded-lg bg-background">
                      No parent items found{parentSearch ? ` for "${parentSearch}"` : ""}. Add them in Admin → Parent Items.
                    </div>
                  )}
                  {form.parent_item_id && (
                    <div className="flex items-center gap-2 text-xs bg-primary/5 px-3 py-1.5 rounded-lg">
                      <span className="font-mono">{form.parent_item_id}</span> — <span className="font-medium">{form.parent_item_name}</span>
                      <button className="ml-auto text-destructive" onClick={() => setForm({ ...form, parent_item_id: "", parent_item_name: "" })}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!editMode && form.parent_item_id && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Parent Item</Label>
                  <p className="text-sm mt-1"><span className="font-mono text-muted-foreground">{form.parent_item_id}</span> — {form.parent_item_name}</p>
                </div>
              )}
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Long Description</Label>
                {editMode && !vendorRestricted ? <RichTextEditor value={form.long_description || form.description} onChange={(v) => setForm({ ...form, long_description: v, description: v })} placeholder="Detailed product description..." minHeight="120px" /> : <p className="text-sm mt-1 text-muted-foreground">{form.long_description || form.description || "—"}</p>}
              </div>

              {/* Vendor Selection with State/District Filtering (Admin only) */}
              {editMode && !vendorRestricted && !isVendor && (
                <>
                  <div className="col-span-2 p-4 rounded-lg bg-accent/30 border border-primary/10 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Select Vendor
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">State</Label>
                        <Select value={vendorState || "__all__"} onValueChange={(v) => { setVendorState(v === "__all__" ? "" : v); setVendorDistrict(""); }}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="All States" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All States</SelectItem>
                            {vendorStates.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">District</Label>
                        <Select value={vendorDistrict || "__all__"} onValueChange={(v) => setVendorDistrict(v === "__all__" ? "" : v)}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="All Districts" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All Districts</SelectItem>
                            {vendorDistricts.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Search (Name / Phone / ID)</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className="h-8 text-xs pl-7"
                            placeholder="Search vendor..."
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Vendor * ({filteredVendors.length} found)</Label>
                      <Select value={form.vendor_id || undefined} onValueChange={handleVendorChange}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {filteredVendors.map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{v.business_name}</span>
                                <span className="text-[10px] text-muted-foreground">{v.mobile}</span>
                                {v.city_name && <span className="text-[10px] text-muted-foreground">• {v.city_name}</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Category *</Label>
                    <Select value={form.category_id || undefined} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{(dbCategories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subcategory</Label>
                    <Select value={form.subcategory_id || "__none__"} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {(dbSubcategories || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editMode ? (
                  <Select value={form.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Approved)</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      {!isVendor && <SelectItem value="pending_approval">Pending Approval</SelectItem>}
                      {!isVendor && <SelectItem value="rejected">Rejected</SelectItem>}
                    </SelectContent>
                  </Select>
                ) : <div className="mt-1"><StatusBadge status={product?.status || "active"} /></div>}
              </div>
              {editMode && form.status === 'rejected' && !isVendor && (
                <div className="col-span-2">
                  <Label className="text-xs text-destructive font-semibold">Rejection Reason *</Label>
                  <Textarea value={form.rejection_reason} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} className="mt-1 border-destructive/50" rows={2} />
                </div>
              )}
              {editMode && !vendorRestricted && form.product_type !== "variable" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="mt-1" />
                </div>
              )}
            </div>

            {/* Service fields */}
            {form.product_type === "service" && editMode && !vendorRestricted && (
              <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Service Duration & Support</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Hours</Label>
                    <Input type="number" min={0} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Minutes</Label>
                    <Input type="number" min={0} max={59} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Promise P4U</Label>
                    <Input value={form.promise_p4u} onChange={(e) => setForm({ ...form, promise_p4u: e.target.value })} className="mt-1" placeholder="Quality guarantee..." />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Helpline</Label>
                    <Input value={form.helpline_number} onChange={(e) => setForm({ ...form, helpline_number: e.target.value })} className="mt-1" placeholder="+91-XXXXXXXXXX" />
                  </div>
                </div>
              </div>
            )}

            {/* Thumbnail, Banner & Replacement Time */}
            {editMode && !vendorRestricted && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Thumbnail</Label>
                  <MediaLibraryPicker value={form.thumbnail_image} onChange={(url) => setForm({ ...form, thumbnail_image: url })} folder="product-images" label="Set Thumbnail" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Banner</Label>
                  <MediaLibraryPicker value={form.banner_image} onChange={(url) => setForm({ ...form, banner_image: url })} folder="product-images" label="Set Banner" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Socio Shopping Icon</Label>
                  <MediaLibraryPicker value={form.socio_shopping_icon} onChange={(url) => setForm({ ...form, socio_shopping_icon: url })} folder="product-images" label="Set Shopping Icon" />
                  <p className="text-[10px] text-muted-foreground mt-1">Small square image shown as product sticker on social posts. Auto-generated from product image if empty.</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Replacement Time</Label>
                  <Select value={form.replacement_time || "12 Hours"} onValueChange={(v) => setForm({ ...form, replacement_time: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12 Hours">12 Hours</SelectItem>
                      <SelectItem value="24 Hours">24 Hours</SelectItem>
                      <SelectItem value="24-48 Hours">24-48 Hours</SelectItem>
                      <SelectItem value="1-4 Days">1-4 Days</SelectItem>
                      <SelectItem value="4-7 Days">4-7 Days</SelectItem>
                      <SelectItem value="7-14 Days">7-14 Days</SelectItem>
                      <SelectItem value="No Replacement">No Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </TabsContent>

          {/* PRICING TAB */}
          <TabsContent value="pricing" className="space-y-4 mt-3">
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">MRP (₹)</Label>
                  {editMode ? <Input type="number" min="0" step="0.01" value={form.price === 0 ? "" : form.price} onChange={(e) => { const v = e.target.value; setForm({ ...form, price: v === "" ? 0 : Number(v) }); }} placeholder="0" className="mt-1" /> : <p className="text-sm font-bold mt-1">₹{product?.price.toLocaleString()}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax Slab</Label>
                  {editMode && !vendorRestricted ? (
                    <Select value={form.tax_slab_id || "__manual__"} onValueChange={(v) => setForm({ ...form, tax_slab_id: v === "__manual__" ? "" : v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select tax" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__manual__">Manual</SelectItem>
                        {(taxSlabs || []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <p className="text-sm font-medium mt-1">{taxSlabs?.find((t: any) => t.id === form.tax_slab_id)?.name || `₹${form.tax}`}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {form.product_type === "service" ? "SAC Code (Service Code)" : "HSN Code"}
                    <span className="text-[10px] text-muted-foreground/70 ml-1">— required for GST invoice</span>
                  </Label>
                  {editMode && !vendorRestricted ? (
                    <Input
                      value={form.product_type === "service" ? form.sac_code : form.hsn_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setForm({ ...form, [form.product_type === "service" ? "sac_code" : "hsn_code"]: val });
                      }}
                      className="mt-1 font-mono"
                      placeholder={form.product_type === "service" ? "e.g. 998314" : "e.g. 84713010"}
                      maxLength={8}
                    />
                  ) : <p className="text-sm font-medium mt-1 font-mono">{(form.product_type === "service" ? form.sac_code : form.hsn_code) || "—"}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax Amount (auto)</Label>
                  <p className="text-sm font-medium mt-2">₹{taxAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Discount Type</Label>
                  {editMode ? (
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <p className="text-sm mt-1 capitalize">{form.discount_type}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discount {form.discount_type === "percentage" ? "(%)" : "(₹)"}</Label>
                  {editMode ? <Input type="number" min="0" step="0.01" value={form.discount === 0 ? "" : form.discount} onChange={(e) => { const v = e.target.value; setForm({ ...form, discount: v === "" ? 0 : Number(v) }); }} placeholder="0" className="mt-1" /> : <p className="text-sm font-medium mt-1 text-success">{form.discount > 0 ? (form.discount_type === "percentage" ? `${form.discount}%` : `₹${form.discount}`) : "—"}</p>}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold">Selling Price</span>
                  {discountPct > 0 && <Badge className="ml-2 bg-success/10 text-success border-0 text-[10px]">{discountPct}% OFF</Badge>}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">₹{sellingPrice.toLocaleString()}</span>
                  {discountAmount > 0 && <span className="text-xs text-muted-foreground line-through ml-2">₹{(form.price + taxAmount).toLocaleString()}</span>}
                </div>
              </div>
            </div>

            {/* Points */}
            {!isVendor && (
              <div className="p-4 rounded-lg bg-accent/30 border border-primary/10">
                <div className="flex items-center gap-4">
                  <Star className="h-8 w-8 text-warning shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max Points Redeemable</Label>
                    {editMode ? <Input type="number" value={form.max_points_redeemable} onChange={(e) => setForm({ ...form, max_points_redeemable: Number(e.target.value) })} className="mt-1 max-w-32" /> : <p className="text-xl font-bold">{product?.max_points_redeemable} pts</p>}
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max User Redemption %</Label>
                    {editMode ? <Input type="number" value={form.max_redemption_percentage ?? ""} onChange={(e) => setForm({ ...form, max_redemption_percentage: e.target.value ? Number(e.target.value) : null })} className="mt-1 max-w-32" placeholder="Vendor default" /> : <p className="text-xl font-bold">{(product as any)?.max_redemption_percentage != null ? `${(product as any).max_redemption_percentage}%` : "Vendor default"}</p>}
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Vendor to P4U Commission</Label>
                    {editMode ? <Input type="number" value={form.commission_override ?? ""} onChange={(e) => setForm({ ...form, commission_override: e.target.value ? Number(e.target.value) : null })} className="mt-1 max-w-32" placeholder="Vendor default" /> : <p className="text-xl font-bold">{(product as any)?.commission_override != null ? `${(product as any).commission_override}%` : "Vendor default"}</p>}
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground mt-2">Product-level values override vendor-level, which overrides plan-level.</p>
              </div>
            )}
          </TabsContent>

          {/* ATTRIBUTES TAB */}
          <TabsContent value="attributes" className="space-y-4 mt-3">
            {editMode && !vendorRestricted && (attributes || []).length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">Select attribute values for this product. For variable products, variants will be generated from selected combinations.</p>
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
                              <button key={v.id} onClick={() => toggleAttribute(attr.id, attr.name, v.value)}
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
                            <button key={v.id} onClick={() => toggleAttribute(attr.id, attr.name, v.value)}
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
                  <Button onClick={generateVariants} className="gap-1">
                    <Layers className="h-4 w-4" /> Generate Variants from Selection
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Specifications</h4>
                {(form.product_attributes || []).length > 0 ? (
                  (form.product_attributes || []).map((attr: any, i: number) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[100px]">{attr.attribute_name}:</span>
                      <span className="font-medium">{(attr.values || []).join(", ")}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-muted-foreground">No attributes configured</p>}
              </div>
            )}
          </TabsContent>

          {/* VARIANTS TAB */}
          {form.product_type === "variable" && (
            <TabsContent value="variants" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{variants.length} variant(s)</p>
                {editMode && (
                  <Button size="sm" variant="outline" onClick={generateVariants} className="gap-1">
                    <Plus className="h-3 w-3" /> Regenerate
                  </Button>
                )}
              </div>
              {variants.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg">
                  <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No variants yet. Select attributes and generate.</p>
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
                            <Switch checked={v.is_active} onCheckedChange={(checked) => updateVariant(i, "is_active", checked)} disabled={!editMode} />
                            {editMode && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeVariant(i)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {editMode && (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {/* SEO TAB */}
          <TabsContent value="seo" className="space-y-4 mt-3">
            <div>
              <Label className="text-xs text-muted-foreground">URL Slug</Label>
              {editMode ? <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="product-url-slug" /> : <p className="text-sm mt-1">{form.slug || "—"}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Title</Label>
              {editMode ? <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="mt-1" placeholder="SEO title (max 60 chars)" maxLength={60} /> : <p className="text-sm mt-1">{form.meta_title || "—"}</p>}
              {form.meta_title && <p className="text-[10px] text-muted-foreground">{form.meta_title.length}/60</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Description</Label>
              {editMode ? <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="mt-1" placeholder="SEO description (max 160 chars)" maxLength={160} rows={3} /> : <p className="text-sm mt-1">{form.meta_description || "—"}</p>}
              {form.meta_description && <p className="text-[10px] text-muted-foreground">{form.meta_description.length}/160</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Emoji Icon</Label>
                {editMode && !vendorRestricted ? <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-1" placeholder="📦" /> : <p className="text-2xl mt-1">{form.emoji}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Youtube className="h-3 w-3 text-destructive" /> YouTube Video</Label>
                {editMode ? <Input value={form.youtube_video_url} onChange={(e) => setForm({ ...form, youtube_video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="mt-1" /> : form.youtube_video_url ? <a href={form.youtube_video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline mt-1 block">{form.youtube_video_url}</a> : <p className="text-xs text-muted-foreground mt-1">No video</p>}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {vendorRestricted && (
          <p className="text-xs text-muted-foreground bg-warning/10 p-3 rounded-lg mt-2">
            ⚠️ This product is approved. You can only edit images, price, discount, and status.
          </p>
        )}

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && !isVendor && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create Product" : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setEditMode(true)}>Edit</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Inactivation Reason Dialog */}
      <Dialog open={showInactivateDialog} onOpenChange={setShowInactivateDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Reason for Inactivation</DialogTitle>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">This product will be hidden from customers. Please provide a reason.</p>
            <Textarea value={form.inactivation_reason} onChange={(e) => setForm({ ...form, inactivation_reason: e.target.value })} placeholder="e.g. Out of stock, Discontinued, Seasonal..." rows={3} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowInactivateDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmInactivate}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
