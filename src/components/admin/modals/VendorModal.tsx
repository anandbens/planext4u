import { Vendor } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Store, Percent, Crown, ArrowRight, Trash2, FileText, Download, Camera, CreditCard, Building2, Image as ImageIcon } from "lucide-react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VendorModalProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Vendor>) => Promise<void>;
  onCreate?: (data: Partial<Vendor>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  vendorType?: "product" | "service";
  onRefresh?: () => void;
}

const statusFlow: Vendor["status"][] = ["pending", "level1_approved", "level2_approved", "verified"];

const emptyForm = {
  name: "", business_name: "", email: "", mobile: "", rejection_reason: "",
  commission_rate: 10, membership: "basic", status: "pending" as Vendor["status"],
  category_id: "1", city_id: "1", area_id: "1", plan_id: "",
  plan_payment_status: "unpaid", plan_transaction_id: "", shop_photo_url: "",
};

export function VendorModal({ vendor, open, onOpenChange, mode, onSave, onCreate, onDelete, vendorType = "product", onRefresh }: VendorModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [modalTab, setModalTab] = useState("details");

  const { data: vendorPlans = [] } = useQuery({
    queryKey: ["vendorPlansDropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_plans").select("id, plan_name, plan_type, visibility_type, payment_mode, price, commission_percentage").eq("is_active", true).order("plan_tier");
      return data || [];
    },
  });

  // Fetch KYC documents for this vendor
  const { data: kycDocs = [] } = useQuery({
    queryKey: ["vendorKyc", vendor?.id],
    enabled: !!vendor?.id && !isCreate,
    queryFn: async () => {
      // Find vendor application by phone
      const { data } = await supabase.from("vendor_applications").select("*").eq("phone", vendor!.mobile).limit(1);
      return data || [];
    },
  });

  // Fetch KYC documents from kyc_documents table
  const { data: kycDocuments = [] } = useQuery({
    queryKey: ["vendorKycDocs", vendor?.id],
    enabled: !!vendor?.id && !isCreate,
    queryFn: async () => {
      const { data } = await supabase.from("kyc_documents").select("*").eq("user_id", vendor!.id);
      return data || [];
    },
  });

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm);
      setEditMode(true);
      setModalTab("details");
    } else if (vendor) {
      setForm({
        name: vendor.name, business_name: vendor.business_name,
        email: vendor.email, mobile: vendor.mobile,
        rejection_reason: (vendor as any).rejection_reason || "",
        commission_rate: vendor.commission_rate, membership: vendor.membership,
        status: vendor.status, category_id: vendor.category_id,
        city_id: vendor.city_id, area_id: vendor.area_id,
        plan_id: (vendor as any).plan_id || "",
        plan_payment_status: (vendor as any).plan_payment_status || "unpaid",
        plan_transaction_id: (vendor as any).plan_transaction_id || "",
        shop_photo_url: (vendor as any).shop_photo_url || "",
      });
      setEditMode(mode === "edit");
    }
  }, [vendor, mode]);

  const currentStep = vendor ? statusFlow.indexOf(vendor.status) : -1;

  const handleSave = async () => {
    if (!form.name || !form.business_name) return;
    if (form.status === 'rejected' && !form.rejection_reason?.trim()) return;
    setSaving(true);
    try {
      if (isCreate) { await onCreate?.(form); }
      else if (vendor) { await onSave?.(vendor.id, form); }
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!vendor) return;
    setSaving(true);
    try { await onDelete?.(vendor.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handlePaymentStatusChange = async (status: string) => {
    if (!vendor) return;
    setSaving(true);
    try {
      await supabase.from("vendors").update({ plan_payment_status: status }).eq("id", vendor.id);
      setForm({ ...form, plan_payment_status: status });
      toast.success(`Payment status updated to ${status}`);
      onRefresh?.();
    } finally { setSaving(false); }
  };

  const handleTransactionIdSave = async () => {
    if (!vendor) return;
    setSaving(true);
    try {
      await supabase.from("vendors").update({ plan_transaction_id: form.plan_transaction_id }).eq("id", vendor.id);
      toast.success("Transaction ID saved");
      onRefresh?.();
    } finally { setSaving(false); }
  };

  const vendorApp = kycDocs[0];

  const downloadDoc = (url: string, name: string) => {
    if (!url) return;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-info flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{isCreate ? `New ${vendorType === "service" ? "Service" : "Product"} Vendor` : vendor?.business_name}</span>
              {!isCreate && vendor && <p className="text-xs font-normal text-muted-foreground mt-0.5">{vendor.name} · {vendor.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && vendor && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={vendor.status} />
              <Badge className={`border-0 text-[10px] ${(vendor as any).plan_payment_status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                <CreditCard className="h-3 w-3 mr-1" />
                {(vendor as any).plan_payment_status || "unpaid"}
              </Badge>
            </DialogDescription>
          )}
        </DialogHeader>

        {!isCreate && vendor && (
          <Tabs value={modalTab} onValueChange={setModalTab} className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="kyc" className="flex-1">KYC & Documents</TabsTrigger>
              <TabsTrigger value="payment" className="flex-1">Plan & Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {/* Status Flow */}
              {vendor.status !== "rejected" && (
                <div className="flex items-center gap-1 py-3">
                  {statusFlow.map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentStep ? 'gradient-primary' : 'bg-secondary'}`} />
                      {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 mt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Owner Name *</Label>
                    {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Owner name" /> : <p className="text-sm font-medium mt-1">{vendor?.name}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Business Name *</Label>
                    {editMode ? <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-1" placeholder="Business name" /> : <p className="text-sm font-medium mt-1">{vendor?.business_name}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                    {editMode ? <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor?.email}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                    {editMode ? <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor?.mobile}</p>}
                  </div>
                  {editMode && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vendor["status"] })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusFlow.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editMode && form.status === 'rejected' && (
                    <div className="col-span-2">
                      <Label className="text-xs text-destructive font-semibold">Rejection Reason *</Label>
                      <Textarea value={form.rejection_reason} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} className="mt-1 border-destructive/50" rows={2} />
                    </div>
                  )}
                  {!editMode && vendor?.status === 'rejected' && (vendor as any).rejection_reason && (
                    <div className="col-span-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <Label className="text-xs text-destructive font-semibold">Rejection Reason</Label>
                      <p className="text-sm mt-1">{(vendor as any).rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">P4U Commission Rate</Label></div>
                    {editMode ? <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" /> : <p className="text-xl font-bold">{vendor?.commission_rate}%</p>}
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1"><Crown className="h-4 w-4 text-warning" /><Label className="text-xs text-muted-foreground">Vendor Plan</Label></div>
                    {editMode ? (
                      <Select value={form.plan_id || "none"} onValueChange={(v) => {
                        const plan = vendorPlans.find((p: any) => p.id === v);
                        setForm({
                          ...form,
                          plan_id: v === "none" ? "" : v,
                          membership: plan?.plan_name?.toLowerCase() || form.membership,
                          commission_rate: plan?.commission_percentage ?? form.commission_rate,
                        });
                      }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {vendorPlans.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.plan_name} ({p.plan_type}) — ₹{p.price}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xl font-bold capitalize">
                        {vendorPlans.find((p: any) => p.id === form.plan_id)?.plan_name || vendor?.membership || "No Plan"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shop Photo */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2"><Camera className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Shop Photo</Label></div>
                  {editMode ? (
                    <MediaLibraryPicker
                      value={form.shop_photo_url || ""}
                      onChange={(url) => setForm({ ...form, shop_photo_url: url })}
                      folder="vendor-logos"
                      label="Shop Photo"
                      aspectRatio="aspect-video"
                    />
                  ) : (
                    (form.shop_photo_url || (vendor as any)?.shop_photo_url) ? (
                      <img src={form.shop_photo_url || (vendor as any)?.shop_photo_url} alt="Shop" className="rounded-lg max-h-40 object-cover w-full" />
                    ) : (
                      <div className="h-24 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-muted-foreground text-sm">
                        <ImageIcon className="h-5 w-5 mr-2" /> No shop photo uploaded
                      </div>
                    )
                  )}
                  {vendorApp?.shop_photo_url && !form.shop_photo_url && !editMode && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">From application:</p>
                      <img src={vendorApp.shop_photo_url} alt="Shop from application" className="rounded-lg max-h-32 object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kyc">
              <div className="space-y-4 mt-2">
                {/* Vendor Application KYC */}
                {vendorApp ? (
                  <>
                    <h4 className="text-sm font-semibold">Vendor Application Documents</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "GST Certificate", url: vendorApp.gst_certificate_url, num: vendorApp.gst_number },
                        { label: "PAN Card", url: vendorApp.pan_image_url, num: vendorApp.pan_number },
                        { label: "Aadhaar Front", url: vendorApp.aadhaar_front_url, num: vendorApp.aadhaar_number },
                        { label: "Aadhaar Back", url: vendorApp.aadhaar_back_url },
                        { label: "FSSAI License", url: vendorApp.fssai_url },
                        { label: "Store Logo", url: vendorApp.store_logo_url },
                        { label: "Shop Photo", url: vendorApp.shop_photo_url },
                      ].filter(d => d.url).map((doc, i) => (
                        <Card key={i} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium">{doc.label}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDoc(doc.url!, doc.label)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {doc.num && <p className="text-[10px] text-muted-foreground font-mono">{doc.num}</p>}
                          {doc.url && (
                            <img src={doc.url} alt={doc.label} className="mt-2 rounded max-h-24 object-cover w-full cursor-pointer" onClick={() => window.open(doc.url!, "_blank")} />
                          )}
                        </Card>
                      ))}
                    </div>

                    {/* Bank Details */}
                    <h4 className="text-sm font-semibold mt-4">Bank Details</h4>
                    <Card className="p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Account:</span> <span className="font-mono">{vendorApp.bank_account_number || "—"}</span></div>
                        <div><span className="text-muted-foreground">IFSC:</span> <span className="font-mono">{vendorApp.bank_ifsc || "—"}</span></div>
                        <div className="col-span-2"><span className="text-muted-foreground">Holder:</span> <span>{vendorApp.bank_holder_name || "—"}</span></div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">No vendor application found for this vendor.</div>
                )}

                {/* KYC Documents from kyc_documents table */}
                {kycDocuments.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mt-4">KYC Documents</h4>
                    {kycDocuments.map((doc) => (
                      <Card key={doc.id} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium capitalize">{doc.document_type}</span>
                            <StatusBadge status={doc.status} />
                          </div>
                          <div className="flex gap-1">
                            {doc.front_image_url && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDoc(doc.front_image_url!, "Front")}><Download className="h-3.5 w-3.5" /></Button>}
                            {doc.back_image_url && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDoc(doc.back_image_url!, "Back")}><Download className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{doc.document_number}</p>
                        <div className="flex gap-2 mt-2">
                          {doc.front_image_url && <img src={doc.front_image_url} alt="Front" className="rounded max-h-20 object-cover cursor-pointer" onClick={() => window.open(doc.front_image_url!, "_blank")} />}
                          {doc.back_image_url && <img src={doc.back_image_url} alt="Back" className="rounded max-h-20 object-cover cursor-pointer" onClick={() => window.open(doc.back_image_url!, "_blank")} />}
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payment">
              <div className="space-y-4 mt-2">
                {/* Plan Assignment */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2"><Crown className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Assigned Plan</Label></div>
                  {editMode ? (
                    <Select value={form.plan_id || "none"} onValueChange={(v) => setForm({ ...form, plan_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Plan</SelectItem>
                        {vendorPlans.filter(p => p.plan_type === "local").length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Local Plans</div>
                            {vendorPlans.filter(p => p.plan_type === "local").map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.plan_name} - ₹{p.price} ({p.payment_mode})</SelectItem>
                            ))}
                          </>
                        )}
                        {vendorPlans.filter(p => p.plan_type === "vip").length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">VIP Plans</div>
                            {vendorPlans.filter(p => p.plan_type === "vip").map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.plan_name} - ₹{p.price} ({p.payment_mode})</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">{vendorPlans.find(p => p.id === (vendor as any)?.plan_id)?.plan_name || "No Plan"}</p>
                  )}
                </div>

                {/* Payment Status */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Payment Status</Label></div>
                  <div className="flex items-center gap-2">
                    <Select value={form.plan_payment_status} onValueChange={handlePaymentStatusChange}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="offline_pending">Offline Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={`border-0 ${form.plan_payment_status === 'paid' ? 'bg-success/10 text-success' : form.plan_payment_status === 'offline_pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {form.plan_payment_status}
                    </Badge>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Transaction Reference ID</Label></div>
                  <div className="flex gap-2">
                    <Input value={form.plan_transaction_id} onChange={(e) => setForm({ ...form, plan_transaction_id: e.target.value })} placeholder="Enter transaction ID" />
                    <Button size="sm" onClick={handleTransactionIdSave} disabled={saving}>Save</Button>
                  </div>
                  {(vendor as any)?.plan_transaction_id && (
                    <p className="text-xs text-muted-foreground mt-1">Current: <span className="font-mono">{(vendor as any).plan_transaction_id}</span></p>
                  )}
                </div>

                {/* Company Account Info */}
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-primary" /> Company Account for Offline Payment</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Account Name:</span> <span className="font-medium">Planext4U Pvt Ltd</span></div>
                    <div><span className="text-muted-foreground">Account No:</span> <span className="font-mono font-medium">1234567890123</span></div>
                    <div><span className="text-muted-foreground">IFSC:</span> <span className="font-mono font-medium">SBIN0001234</span></div>
                    <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">State Bank of India</span></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Share these details with the vendor for offline payment. Once paid, update the payment status and transaction ID above.</p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Create mode form */}
        {isCreate && (
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Owner Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Owner name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Business Name *</Label>
                <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-1" placeholder="Business name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground"><Mail className="h-3 w-3 inline mr-1" />Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground"><Phone className="h-3 w-3 inline mr-1" />Mobile</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" />
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Commission Rate</Label></div>
                <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" />
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1"><Crown className="h-4 w-4 text-warning" /><Label className="text-xs text-muted-foreground">Membership</Label></div>
                <Select value={form.membership} onValueChange={(v) => setForm({ ...form, membership: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.business_name}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create Vendor" : "Save Changes"}
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
    </Dialog>
  );
}
