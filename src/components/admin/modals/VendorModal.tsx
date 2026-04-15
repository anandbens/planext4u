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
import { Mail, Phone, Store, Percent, Crown, ArrowRight, Trash2, FileText, Download, Camera, CreditCard, Building2, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
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
  max_redemption_percentage: null as number | null,
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

  // Fetch KYC documents from vendor application
  const { data: kycDocs = [] } = useQuery({
    queryKey: ["vendorKyc", vendor?.id],
    enabled: !!vendor?.id && !isCreate,
    queryFn: async () => {
      // Try matching by phone first, then email
      const phone = vendor!.mobile;
      const email = vendor!.email;
      const { data } = await supabase.from("vendor_applications").select("*")
        .or(`phone.eq.${phone},email.eq.${email}`)
        .order("created_at", { ascending: false })
        .limit(1);
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
        max_redemption_percentage: (vendor as any).max_redemption_percentage ?? null,
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
  const [kycAction, setKycAction] = useState<"approve" | "reject" | null>(null);
  const [kycNotes, setKycNotes] = useState("");
  const [kycSaving, setKycSaving] = useState(false);

  const handleKycVerification = async (action: "approve" | "reject") => {
    if (!vendorApp) return;
    setKycSaving(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      await supabase.from("vendor_applications" as any).update({
        kyc_status: newStatus,
        admin_notes: kycNotes || null,
      } as any).eq("id", vendorApp.id);

      // Also update kyc_documents if they exist
      if (kycDocuments.length > 0) {
        for (const doc of kycDocuments) {
          await supabase.from("kyc_documents").update({
            status: newStatus,
            admin_notes: kycNotes || null,
            rejection_reason: action === "reject" ? kycNotes : null,
          }).eq("id", doc.id);
        }
      }

      toast.success(`KYC ${action === "approve" ? "approved" : "rejected"} successfully`);
      setKycAction(null);
      setKycNotes("");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update KYC status");
    } finally {
      setKycSaving(false);
    }
  };

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
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      KYC & Identity Documents
                    </h4>

                    {/* Aadhaar */}
                    {(vendorApp.aadhaar_number || vendorApp.aadhaar_front_url) && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-bold flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" /> Aadhaar Card
                          </h5>
                          <Badge className="bg-success/10 text-success border-0 text-[10px]">Submitted</Badge>
                        </div>
                        {vendorApp.aadhaar_number && (
                          <p className="text-xs text-muted-foreground font-mono mb-2">No: {vendorApp.aadhaar_number}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {vendorApp.aadhaar_front_url && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Front</p>
                              <img src={vendorApp.aadhaar_front_url} alt="Aadhaar Front" className="rounded-lg max-h-28 object-cover w-full cursor-pointer border border-border" onClick={() => window.open(vendorApp.aadhaar_front_url!, "_blank")} />
                            </div>
                          )}
                          {vendorApp.aadhaar_back_url && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Back</p>
                              <img src={vendorApp.aadhaar_back_url} alt="Aadhaar Back" className="rounded-lg max-h-28 object-cover w-full cursor-pointer border border-border" onClick={() => window.open(vendorApp.aadhaar_back_url!, "_blank")} />
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* PAN */}
                    {(vendorApp.pan_number || vendorApp.pan_image_url) && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-bold flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" /> PAN Card
                          </h5>
                          <Badge className="bg-success/10 text-success border-0 text-[10px]">Submitted</Badge>
                        </div>
                        {vendorApp.pan_number && (
                          <p className="text-xs text-muted-foreground font-mono mb-2">No: {vendorApp.pan_number}</p>
                        )}
                        {vendorApp.pan_image_url && (
                          <img src={vendorApp.pan_image_url} alt="PAN" className="rounded-lg max-h-28 object-cover cursor-pointer border border-border" onClick={() => window.open(vendorApp.pan_image_url!, "_blank")} />
                        )}
                      </Card>
                    )}

                    {/* GST */}
                    {(vendorApp.gst_number || vendorApp.gst_certificate_url) && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-bold flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" /> GST Certificate
                          </h5>
                          <Badge className="bg-success/10 text-success border-0 text-[10px]">Submitted</Badge>
                        </div>
                        {vendorApp.gst_number && (
                          <p className="text-xs text-muted-foreground font-mono mb-2">GSTIN: {vendorApp.gst_number}</p>
                        )}
                        {vendorApp.gst_certificate_url && (
                          <img src={vendorApp.gst_certificate_url} alt="GST" className="rounded-lg max-h-28 object-cover cursor-pointer border border-border" onClick={() => window.open(vendorApp.gst_certificate_url!, "_blank")} />
                        )}
                      </Card>
                    )}

                    {/* FSSAI */}
                    {vendorApp.fssai_url && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-bold flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" /> FSSAI License
                          </h5>
                          <Badge className="bg-success/10 text-success border-0 text-[10px]">Submitted</Badge>
                        </div>
                        <img src={vendorApp.fssai_url} alt="FSSAI" className="rounded-lg max-h-28 object-cover cursor-pointer border border-border" onClick={() => window.open(vendorApp.fssai_url!, "_blank")} />
                      </Card>
                    )}

                    {/* Store Logo & Shop Photo */}
                    {(vendorApp.store_logo_url || vendorApp.shop_photo_url) && (
                      <Card className="p-4">
                        <h5 className="text-xs font-bold flex items-center gap-2 mb-3">
                          <Camera className="h-3.5 w-3.5 text-primary" /> Store Images
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {vendorApp.store_logo_url && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Store Logo</p>
                              <img src={vendorApp.store_logo_url} alt="Logo" className="rounded-lg max-h-28 object-cover w-full cursor-pointer border border-border" onClick={() => window.open(vendorApp.store_logo_url!, "_blank")} />
                            </div>
                          )}
                          {vendorApp.shop_photo_url && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Shop Photo</p>
                              <img src={vendorApp.shop_photo_url} alt="Shop" className="rounded-lg max-h-28 object-cover w-full cursor-pointer border border-border" onClick={() => window.open(vendorApp.shop_photo_url!, "_blank")} />
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Bank Details */}
                    <h4 className="text-sm font-semibold flex items-center gap-2 mt-4">
                      <Building2 className="h-4 w-4 text-primary" /> Bank Details
                    </h4>
                    <Card className="p-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-muted-foreground block mb-0.5">Account Holder</span> <span className="font-medium">{vendorApp.bank_holder_name || "—"}</span></div>
                        <div><span className="text-muted-foreground block mb-0.5">Account Number</span> <span className="font-mono font-medium">{vendorApp.bank_account_number || "—"}</span></div>
                        <div><span className="text-muted-foreground block mb-0.5">IFSC Code</span> <span className="font-mono font-medium">{vendorApp.bank_ifsc || "—"}</span></div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">No vendor application found for this vendor.</div>
                )}

                {/* KYC Documents from kyc_documents table */}
                {kycDocuments.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mt-4">Additional KYC Documents</h4>
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

                {/* KYC Verification Actions */}
                {vendorApp && (
                  <Card className="p-4 mt-4 border-primary/20">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-primary" /> KYC Verification
                    </h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Current Status:</span>
                      <StatusBadge status={(vendorApp as any).kyc_status || vendorApp.status || "pending"} />
                    </div>
                    {(vendorApp as any).admin_notes && (
                      <p className="text-xs text-muted-foreground mb-3 p-2 bg-secondary/30 rounded">
                        <strong>Admin Notes:</strong> {(vendorApp as any).admin_notes}
                      </p>
                    )}
                    {kycAction ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">{kycAction === "approve" ? "Approve KYC Documents" : "Reject KYC Documents"}</p>
                        <Textarea
                          placeholder={kycAction === "approve" ? "Optional notes..." : "Rejection reason (required)..."}
                          value={kycNotes}
                          onChange={e => setKycNotes(e.target.value)}
                          className="text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setKycAction(null); setKycNotes(""); }} disabled={kycSaving}>Cancel</Button>
                          <Button
                            size="sm"
                            variant={kycAction === "approve" ? "default" : "destructive"}
                            onClick={() => handleKycVerification(kycAction)}
                            disabled={kycSaving || (kycAction === "reject" && !kycNotes.trim())}
                          >
                            {kycSaving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                            {kycAction === "approve" ? "Confirm Approve" : "Confirm Reject"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" onClick={() => setKycAction("approve")}>
                          <CheckCircle className="h-4 w-4" /> Approve KYC
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => setKycAction("reject")}>
                          <XCircle className="h-4 w-4" /> Reject KYC
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payment">
              <div className="space-y-4 mt-2">
                {/* Vendor Plan */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-2"><Crown className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Vendor Plan</Label></div>
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
                    <p className="text-sm font-medium capitalize">{vendorPlans.find(p => p.id === (vendor as any)?.plan_id)?.plan_name || vendor?.membership || "No Plan"}</p>
                  )}
                </div>

                {/* Commission & Redemption Overrides */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Vendor to P4U Commission</Label></div>
                    {editMode ? <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" /> : <p className="text-xl font-bold">{vendor?.commission_rate}%</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">Overrides plan commission</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-warning" /><Label className="text-xs text-muted-foreground">Max User Redemption %</Label></div>
                    {editMode ? <Input type="number" value={form.max_redemption_percentage ?? ""} onChange={(e) => setForm({ ...form, max_redemption_percentage: e.target.value ? Number(e.target.value) : null })} className="mt-1" placeholder="Plan default" /> : <p className="text-xl font-bold">{(vendor as any)?.max_redemption_percentage != null ? `${(vendor as any).max_redemption_percentage}%` : "Plan default"}</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">Overrides plan redemption</p>
                  </div>
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
                <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Vendor to P4U Commission</Label></div>
                <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" />
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-warning" /><Label className="text-xs text-muted-foreground">Max User Redemption %</Label></div>
                <Input type="number" value={form.max_redemption_percentage ?? ""} onChange={(e) => setForm({ ...form, max_redemption_percentage: e.target.value ? Number(e.target.value) : null })} className="mt-1" placeholder="Plan default" />
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
