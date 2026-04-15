import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Save, Loader2, Camera, X, MapPin, Navigation, CheckCircle, Clock, AlertCircle, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { checkVendorPhoneUnique, checkVendorEmailUnique, validatePhoneFormat, validateEmailFormat } from "@/lib/registration-validation";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const GOOGLE_MAPS_KEY = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";

const STATUS_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'verified', label: 'Verified' },
  { key: 'active', label: 'Active' },
];

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const [loading, setLoading] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=personal, 2=business, 3=kyc, 4=bank, 5=location
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logoCameraRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Category/subcategory state
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [catSearchQuery, setCatSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: customerUser?.name || '', phone: customerUser?.mobile || '', secondary_phone: '',
    email: customerUser?.email || '', state: '', district: '',
    fb_link: '', instagram_link: '',
    business_name: '', business_type: 'proprietorship', store_name: '', category: 'product',
    subcategory: '', business_description: '',
    gst_number: '', gst_certificate_url: '', fssai_url: '',
    pan_number: '', pan_image_url: '',
    aadhaar_number: '', aadhaar_front_url: '', aadhaar_back_url: '',
    bank_account_number: '', bank_confirm_account: '', bank_ifsc: '', bank_holder_name: '',
    store_logo_url: '',
  });

  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({});
  const [fieldChecking, setFieldChecking] = useState<{ phone?: boolean; email?: boolean }>({});

  const handlePhoneBlur = async () => {
    const formatErr = validatePhoneFormat(form.phone);
    if (formatErr) { setFieldErrors(e => ({ ...e, phone: formatErr })); return; }
    setFieldChecking(c => ({ ...c, phone: true }));
    const uniqueErr = await checkVendorPhoneUnique(form.phone);
    setFieldErrors(e => ({ ...e, phone: uniqueErr || undefined }));
    setFieldChecking(c => ({ ...c, phone: false }));
  };

  const handleEmailBlur = async () => {
    const formatErr = validateEmailFormat(form.email);
    if (formatErr) { setFieldErrors(e => ({ ...e, email: formatErr })); return; }
    setFieldChecking(c => ({ ...c, email: true }));
    const uniqueErr = await checkVendorEmailUnique(form.email);
    setFieldErrors(e => ({ ...e, email: uniqueErr || undefined }));
    setFieldChecking(c => ({ ...c, email: false }));
  };

  // Location state
  const [showMapModal, setShowMapModal] = useState(false);
  const [shopLocation, setShopLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load categories based on vendor type
  useEffect(() => {
    const loadCategories = async () => {
      if (form.category === 'product' || form.category === 'both') {
        const cats = await api.getCategories();
        setProductCategories(cats || []);
      }
      if (form.category === 'service' || form.category === 'both') {
        const cats = await api.getServiceCategories();
        setServiceCategories(cats || []);
      }
    };
    loadCategories();
  }, [form.category]);

  useEffect(() => {
    if (customerId) loadExistingApp();
    api.getStates().then(setStates);
  }, [customerId]);

  useEffect(() => {
    if (form.state) {
      const st = states.find(s => s.name === form.state);
      if (st) api.getDistricts(st.id).then(setDistricts);
      else setDistricts([]);
    } else {
      setDistricts([]);
    }
  }, [form.state, states]);

  const loadExistingApp = async () => {
    setAppLoading(true);
    const { data } = await supabase.from('vendor_applications').select('*').eq('user_id', customerId).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const app = data[0];
      setExistingApp(app);
      setForm({
        name: app.name || '', phone: app.phone || '', secondary_phone: app.secondary_phone || '',
        email: app.email || '', state: app.state || '', district: app.district || app.city || '',
        fb_link: app.fb_link || '', instagram_link: app.instagram_link || '',
        business_name: app.business_name || '', business_type: app.business_type || 'proprietorship',
        store_name: app.store_name || '', category: app.category || 'product',
        subcategory: app.subcategory || '', business_description: app.business_description || '',
        gst_number: app.gst_number || '', gst_certificate_url: app.gst_certificate_url || '',
        fssai_url: app.fssai_url || '', pan_number: app.pan_number || '',
        pan_image_url: app.pan_image_url || '', aadhaar_number: app.aadhaar_number || '',
        aadhaar_front_url: app.aadhaar_front_url || '', aadhaar_back_url: app.aadhaar_back_url || '',
        bank_account_number: app.bank_account_number || '', bank_confirm_account: app.bank_account_number || '',
        bank_ifsc: app.bank_ifsc || '', bank_holder_name: app.bank_holder_name || '',
        store_logo_url: app.store_logo_url || '',
      });
    }
    setAppLoading(false);
  };

  const updateField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const uploadFile = async (file: File, field: string) => {
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, PDF allowed"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("File must be under 2MB"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isImage = file.type.startsWith('image/');
    const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
    const ext = isImage ? 'webp' : (file.name.split('.').pop() || 'pdf');
    const fileName = `${user.id}/vendor-${field}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('kyc-documents').upload(fileName, blob, { contentType });
    if (error) { toast.error("Upload failed"); return; }

    const { data: signedData } = await supabase.storage.from('kyc-documents').createSignedUrl(fileName, 365 * 24 * 3600);
    if (signedData?.signedUrl) {
      updateField(field, signedData.signedUrl);
      toast.success("Document uploaded ✓");
    }
  };

  const uploadStoreLogo = async (file: File) => {
    if (!IMAGE_TYPES.includes(file.type) && !ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP allowed"); return;
    }
    if (file.size > MAX_FILE_SIZE) { toast.error("File must be under 2MB"); return; }

    setLogoUploading(true);
    try {
      const uid = customerId || Date.now().toString();
      const { blob, contentType } = await compressToWebP(file);
      const fileName = `store-logos/${uid}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from('vendor-assets').upload(fileName, blob, { contentType, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('vendor-assets').getPublicUrl(fileName);
      updateField('store_logo_url', urlData.publicUrl);
      toast.success("Store logo uploaded ✓");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) uploadFile(file, uploadTarget);
    if (e.target) e.target.value = "";
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadStoreLogo(file);
    if (e.target) e.target.value = "";
  };

  const triggerUpload = (field: string) => {
    setUploadTarget(field);
    setTimeout(() => fileRef.current?.click(), 100);
  };

  const validate = (): string | null => {
    if (step === 1) {
      if (!form.name.trim() || form.name.length < 2) return "Name must be at least 2 characters";
      if (!/^[a-zA-Z\s]+$/.test(form.name)) return "Name can only contain letters and spaces";
      const phoneErr = validatePhoneFormat(form.phone);
      if (phoneErr) return phoneErr;
      const emailErr = validateEmailFormat(form.email);
      if (emailErr) return emailErr;
      if (fieldErrors.phone) return fieldErrors.phone;
      if (fieldErrors.email) return fieldErrors.email;
      if (form.fb_link && !/^https?:\/\/.+/.test(form.fb_link)) return "Facebook link must be a valid URL";
      if (form.instagram_link && !/^https?:\/\/.+/.test(form.instagram_link)) return "Instagram link must be a valid URL";
    }
    if (step === 2) {
      if (!form.business_name.trim()) return "Business name is required";
      if (form.business_name.length > 1000) return "Business name too long";
    }
    if (step === 3) {
      if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) return "Aadhaar must be 12 digits";
      if (form.pan_number && !/^[A-Z0-9]{10}$/i.test(form.pan_number)) return "PAN must be 10 alphanumeric chars";
      if (form.gst_number && !/^[0-9A-Z]{15}$/i.test(form.gst_number)) return "GST must be 15 characters";
      if (!form.aadhaar_number && !form.pan_number) return "Either Aadhaar or PAN is required";
      // Document uploads are mandatory
      if (form.aadhaar_number) {
        if (!form.aadhaar_front_url) return "Aadhaar front image is required";
        if (!form.aadhaar_back_url) return "Aadhaar back image is required";
      }
      if (form.pan_number && !form.pan_image_url) return "PAN card image is required";
      if (form.gst_number && !form.gst_certificate_url) return "GST certificate is required";
    }
    if (step === 4) {
      if (form.bank_account_number && form.bank_account_number !== form.bank_confirm_account) return "Account numbers don't match";
      if (form.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.bank_ifsc)) return "Invalid IFSC code format";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep(s => Math.min(s + 1, 5));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Final uniqueness check before submit
      const phoneErr = await checkVendorPhoneUnique(form.phone);
      if (phoneErr) { toast.error(phoneErr); setLoading(false); return; }
      const emailErr = await checkVendorEmailUnique(form.email);
      if (emailErr) { toast.error(emailErr); setLoading(false); return; }
      const payload = {
        user_id: customerId,
        name: form.name, phone: form.phone, secondary_phone: form.secondary_phone,
        email: form.email, state: form.state, city: form.district, district: form.district,
        fb_link: form.fb_link, instagram_link: form.instagram_link,
        business_name: form.business_name, business_type: form.business_type,
        store_name: form.store_name, category: form.category,
        business_description: form.business_description,
        gst_number: form.gst_number, gst_certificate_url: form.gst_certificate_url,
        pan_number: form.pan_number, pan_image_url: form.pan_image_url,
        aadhaar_number: form.aadhaar_number, aadhaar_front_url: form.aadhaar_front_url,
        aadhaar_back_url: form.aadhaar_back_url,
        bank_account_number: form.bank_account_number, bank_ifsc: form.bank_ifsc,
        bank_holder_name: form.bank_holder_name, store_logo_url: form.store_logo_url,
        selected_categories: selectedCategories,
        selected_subcategories: selectedSubcategories,
        status: 'submitted',
      };

      if (existingApp?.id) {
        const { error } = await supabase.from('vendor_applications').update(payload).eq('id', existingApp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vendor_applications').insert(payload);
        if (error) throw error;
      }
      toast.success("Application submitted! Our team will review within 48 hours.");
      navigate("/app/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    }
    setLoading(false);
  };

  // Completion percentage
  const formCompletion = (() => {
    let filled = 0; let total = 8;
    if (form.name) filled++;
    if (form.phone) filled++;
    if (form.email) filled++;
    if (form.business_name) filled++;
    if (form.aadhaar_number || form.pan_number) filled++;
    if (form.bank_account_number) filled++;
    if (form.gst_number) filled++;
    if (form.business_description) filled++;
    return Math.round((filled / total) * 100);
  })();

  const isEditable = !existingApp || ['draft', 'rejected'].includes(existingApp?.status);
  const currentStatusIdx = existingApp ? STATUS_STEPS.findIndex(s => s.key === existingApp.status) : -1;

  if (appLoading) {
    return <CustomerLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></CustomerLayout>;
  }

  // If already submitted and not rejected, show status
  if (existingApp && !['draft', 'rejected'].includes(existingApp.status)) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <h1 className="text-lg font-bold">Vendor Application</h1>
          </div>

          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Store className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">{existingApp.business_name}</h3>
                <p className="text-xs text-muted-foreground">{existingApp.category} • {existingApp.business_type}</p>
              </div>
            </div>

            {/* Status tracker */}
            <div className="space-y-3">
              {STATUS_STEPS.map((s, i) => {
                const isDone = i <= currentStatusIdx;
                const isCurrent = i === currentStatusIdx;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-success text-success-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {isDone ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isDone ? '' : 'text-muted-foreground'}`}>{s.label}</p>
                      {isCurrent && <p className="text-xs text-primary">Current status</p>}
                    </div>
                    {isDone && <Badge className="bg-success/10 text-success border-0 text-[10px]">Done</Badge>}
                  </div>
                );
              })}
            </div>

            {existingApp.rejection_reason && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-destructive font-medium">Rejection Reason:</p>
                <p className="text-xs text-destructive">{existingApp.rejection_reason}</p>
              </div>
            )}
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  const DocUploadButton = ({ field, label }: { field: string; label: string }) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => triggerUpload(field)}
        className="h-14 w-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
        {(form as any)[field] ? <CheckCircle className="h-4 w-4 text-success" /> : <Upload className="h-4 w-4" />}
        <span className="text-[8px]">{(form as any)[field] ? "Done" : "Upload"}</span>
      </button>
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">JPG/PNG/PDF, max 2MB</p>
      </div>
      {(form as any)[field] && (
        <button type="button" onClick={() => updateField(field, '')} className="ml-auto text-destructive"><X className="h-4 w-4" /></button>
      )}
    </div>
  );

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">Become a Seller</h1>
        </div>

        {/* Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Step {step} of 5</p>
            <span className="text-sm font-bold text-primary">{formCompletion}%</span>
          </div>
          <Progress value={step * 20} className="h-2" />
          <div className="flex justify-between mt-2">
            {["Personal", "Business", "KYC", "Bank", "Review"].map((l, i) => (
              <button key={l} onClick={() => setStep(i + 1)} className={`text-[10px] ${step === i + 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{l}</button>
            ))}
          </div>
        </Card>

        {existingApp?.status === 'rejected' && (
          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Application Rejected</p>
                <p className="text-xs text-destructive/80">{existingApp.rejection_reason || "Please correct issues and resubmit."}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)} maxLength={100} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Phone *</label>
                <Input value={form.phone} onChange={e => { updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); setFieldErrors(er => ({ ...er, phone: undefined })); }} onBlur={handlePhoneBlur} maxLength={10} inputMode="numeric" className={fieldErrors.phone ? 'border-destructive' : ''} />
                {fieldChecking.phone && <p className="text-[10px] text-muted-foreground mt-0.5">Checking...</p>}
                {fieldErrors.phone && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.phone}</p>}</div>
              <div><label className="text-xs font-medium text-muted-foreground">Secondary Phone</label>
                <Input value={form.secondary_phone} onChange={e => updateField('secondary_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input value={form.email} onChange={e => { updateField('email', e.target.value); setFieldErrors(er => ({ ...er, email: undefined })); }} onBlur={handleEmailBlur} type="email" className={fieldErrors.email ? 'border-destructive' : ''} />
                {fieldChecking.email && <p className="text-[10px] text-muted-foreground mt-0.5">Checking...</p>}
                {fieldErrors.email && <p className="text-[10px] text-destructive mt-0.5">{fieldErrors.email}</p>}</div>
              <div><label className="text-xs font-medium text-muted-foreground">State *</label>
                <Select value={form.state} onValueChange={v => { updateField('state', v); updateField('district', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {states.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">District *</label>
                <Select value={form.district} onValueChange={v => updateField('district', v)} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? "Select District" : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Facebook Link</label>
                <Input value={form.fb_link} onChange={e => updateField('fb_link', e.target.value)} placeholder="https://..." /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Instagram Link</label>
                <Input value={form.instagram_link} onChange={e => updateField('instagram_link', e.target.value)} placeholder="https://..." /></div>
            </div>
          </Card>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Business Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Business Name *</label>
                <Input value={form.business_name} onChange={e => updateField('business_name', e.target.value)} maxLength={1000} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Business Type</label>
                <Select value={form.business_type} onValueChange={v => updateField('business_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietorship">Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="pvt_ltd">Pvt Ltd</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Vendor Type *</label>
                <Select value={form.category} onValueChange={v => { updateField('category', v); setSelectedCategories([]); setSelectedSubcategories([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product Seller</SelectItem>
                    <SelectItem value="service">Service Provider</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Store Name</label>
                <Input value={form.store_name} onChange={e => updateField('store_name', e.target.value)} placeholder="Optional" /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Business Description</label>
                <RichTextEditor value={form.business_description} onChange={v => updateField('business_description', v)} placeholder="Describe your business..." minHeight="100px" compact />
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.business_description.length}/2000</p></div>
            </div>

            {/* Category & Subcategory Selection */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Select Categories *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search categories..." value={catSearchQuery} onChange={e => setCatSearchQuery(e.target.value)} className="pl-9" />
              </div>

              {/* Product categories */}
              {(form.category === 'product' || form.category === 'both') && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-primary">Product Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {productCategories
                      .filter(c => !c.parent_id && c.status === 'active')
                      .filter(c => !catSearchQuery || c.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                      .map(cat => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button key={cat.id} type="button"
                            onClick={() => setSelectedCategories(prev => isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'
                            }`}>
                            {cat.image && !cat.image.startsWith('/') && !cat.image.startsWith('http') && <span className="mr-1">{cat.image}</span>}
                            {cat.name}
                          </button>
                        );
                      })}
                  </div>

                  {/* Subcategories for selected product categories */}
                  {selectedCategories.length > 0 && (() => {
                    const subs = productCategories.filter(c => c.parent_id && selectedCategories.includes(c.parent_id) && c.status === 'active');
                    return subs.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Subcategories (optional)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {subs.map(sub => {
                            const isSelected = selectedSubcategories.includes(sub.id);
                            return (
                              <button key={sub.id} type="button"
                                onClick={() => setSelectedSubcategories(prev => isSelected ? prev.filter(id => id !== sub.id) : [...prev, sub.id])}
                                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                  isSelected ? 'bg-accent text-accent-foreground border-primary/50' : 'bg-muted/50 border-border/50 hover:border-primary/30'
                                }`}>
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Service categories */}
              {(form.category === 'service' || form.category === 'both') && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-primary">Service Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {serviceCategories
                      .filter(c => !c.parent_id && c.status === 'active')
                      .filter(c => !catSearchQuery || c.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                      .map(cat => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button key={cat.id} type="button"
                            onClick={() => setSelectedCategories(prev => isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'
                            }`}>
                            {cat.name}
                          </button>
                        );
                      })}
                  </div>

                  {/* Subcategories for selected service categories */}
                  {selectedCategories.length > 0 && (() => {
                    const subs = serviceCategories.filter(c => c.parent_id && selectedCategories.includes(c.parent_id) && c.status === 'active');
                    return subs.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Subcategories (optional)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {subs.map(sub => {
                            const isSelected = selectedSubcategories.includes(sub.id);
                            return (
                              <button key={sub.id} type="button"
                                onClick={() => setSelectedSubcategories(prev => isSelected ? prev.filter(id => id !== sub.id) : [...prev, sub.id])}
                                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                  isSelected ? 'bg-accent text-accent-foreground border-primary/50' : 'bg-muted/50 border-border/50 hover:border-primary/30'
                                }`}>
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {selectedCategories.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{selectedCategories.length} categories, {selectedSubcategories.length} subcategories selected</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Store Logo / Shop Photo</label>
              {form.store_logo_url ? (
                <div className="relative mt-2 group">
                  <div className="aspect-square w-28 rounded-lg overflow-hidden border border-border/30 bg-secondary/20">
                    <img src={form.store_logo_url} alt="Store Logo" className="w-full h-full object-cover" />
                  </div>
                  <button type="button" onClick={() => updateField('store_logo_url', '')} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => logoCameraRef.current?.click()} disabled={logoUploading}
                    className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-5 w-5" />}
                    <span className="text-[8px] mt-0.5">Camera</span>
                  </button>
                  <button type="button" onClick={() => logoFileRef.current?.click()} disabled={logoUploading}
                    className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-5 w-5" />}
                    <span className="text-[8px] mt-0.5">Gallery</span>
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">JPG/PNG/WebP, max 2MB</p>
            </div>
          </Card>
        )}

        {/* Step 3: KYC Documents */}
        {step === 3 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">KYC Documents</h3>
            <p className="text-xs text-muted-foreground">Either Aadhaar or PAN is mandatory. Document images must be uploaded.</p>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">Aadhaar Card</h4>
                <Input value={form.aadhaar_number} onChange={e => updateField('aadhaar_number', e.target.value.replace(/\D/g, ''))} placeholder="12-digit Aadhaar" maxLength={12} />
                <DocUploadButton field="aadhaar_front_url" label="Front Image *" />
                <DocUploadButton field="aadhaar_back_url" label="Back Image *" />
              </div>
              
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">PAN Card</h4>
                <Input value={form.pan_number} onChange={e => updateField('pan_number', e.target.value.toUpperCase())} placeholder="10-char PAN" maxLength={10} />
                <DocUploadButton field="pan_image_url" label="PAN Image *" />
              </div>
              
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">GST {form.category === 'product' ? '(Required)' : '(Optional)'}</h4>
                <Input value={form.gst_number} onChange={e => updateField('gst_number', e.target.value.toUpperCase())} placeholder="15-char GST" maxLength={15} />
                <DocUploadButton field="gst_certificate_url" label="GST Certificate" />
              </div>

              {form.category !== 'service' && (
                <div className="p-3 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-bold">FSSAI License (if food business)</h4>
                  <DocUploadButton field="fssai_url" label="FSSAI Certificate" />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 4: Bank Details */}
        {step === 4 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Bank Verification</h3>
            <p className="text-xs text-muted-foreground">For settlement payouts. We'll verify via penny drop.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Account Number</label>
                <Input value={form.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value.replace(/\D/g, ''))} type="password" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Confirm Account Number</label>
                <Input value={form.bank_confirm_account} onChange={e => updateField('bank_confirm_account', e.target.value.replace(/\D/g, ''))} />
                {form.bank_account_number && form.bank_confirm_account && form.bank_account_number !== form.bank_confirm_account && (
                  <p className="text-[10px] text-destructive mt-0.5">Account numbers don't match</p>
                )}
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
                <Input value={form.bank_holder_name} onChange={e => updateField('bank_holder_name', e.target.value)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">IFSC Code</label>
                <Input value={form.bank_ifsc} onChange={e => updateField('bank_ifsc', e.target.value.toUpperCase())} maxLength={11} placeholder="e.g., SBIN0001234" /></div>
            </div>
          </Card>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Review & Submit</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: form.name },
                { label: 'Phone', value: form.phone },
                { label: 'Email', value: form.email },
                { label: 'Business', value: form.business_name },
                { label: 'Type', value: form.business_type },
                { label: 'Category', value: form.category },
                { label: 'Aadhaar', value: form.aadhaar_number ? `XXXX-XXXX-${form.aadhaar_number.slice(-4)}` : 'Not provided' },
                { label: 'PAN', value: form.pan_number ? `${form.pan_number.slice(0,2)}XXXXXX${form.pan_number.slice(-2)}` : 'Not provided' },
                { label: 'GST', value: form.gst_number || 'Not provided' },
                { label: 'Bank', value: form.bank_account_number ? `****${form.bank_account_number.slice(-4)}` : 'Not provided' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < 5 ? (
            <Button className="flex-1 h-12" onClick={handleNext}>Next</Button>
          ) : (
            <Button className="flex-1 h-12" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Submit Application
            </Button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={logoFileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleLogoFileChange} />
      <input ref={logoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLogoFileChange} />
    </CustomerLayout>
  );
}
