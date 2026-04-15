import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, Loader2, CheckCircle, Upload, X, ArrowLeft, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { api } from "@/lib/api";
import { checkVendorPhoneUnique, checkVendorEmailUnique, validatePhoneFormat, validateEmailFormat } from "@/lib/registration-validation";
import p4uLogo from "@/assets/p4u-logo.png";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', secondary_phone: '',
    email: '', state: '', district: '',
    fb_link: '', instagram_link: '',
    business_name: '', business_type: 'proprietorship', store_name: '', category: 'product',
    subcategory: '', business_description: '',
    gst_number: '', gst_certificate_url: '', fssai_url: '',
    pan_number: '', pan_image_url: '',
    aadhaar_number: '', aadhaar_front_url: '', aadhaar_back_url: '',
    bank_account_number: '', bank_confirm_account: '', bank_ifsc: '', bank_holder_name: '',
    store_logo_url: '',
    latitude: 0, longitude: 0, shop_address: '',
  });
  const [locating, setLocating] = useState(false);
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

  useEffect(() => {
    api.getStates().then(setStates);
  }, []);

  useEffect(() => {
    if (form.state) {
      const st = states.find(s => s.name === form.state);
      if (st) api.getDistricts(st.id).then(setDistricts);
      else setDistricts([]);
    } else {
      setDistricts([]);
    }
  }, [form.state, states]);

  const updateField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const uploadFile = async (file: File, field: string) => {
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, PDF allowed"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("File must be under 2MB"); return; }

    const isImage = file.type.startsWith('image/');
    const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
    const ext = isImage ? 'webp' : (file.name.split('.').pop() || 'pdf');
    const bucket = field === 'store_logo_url' ? 'vendor-assets' : 'kyc-documents';
    const filePath = `vendor-reg/${Date.now()}-${field}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, blob, { contentType, upsert: true });
    if (error) { toast.error("File upload failed. Please try again."); return; }

    if (bucket === 'vendor-assets') {
      // Public bucket - get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      if (urlData?.publicUrl) {
        updateField(field, urlData.publicUrl);
        toast.success("Uploaded ✓");
      }
    } else {
      // Private bucket - get signed URL
      const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(filePath, 365 * 24 * 3600);
      if (signedData?.signedUrl) {
        updateField(field, signedData.signedUrl);
        toast.success("Document uploaded ✓");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) uploadFile(file, uploadTarget);
    if (e.target) e.target.value = "";
  };

  const triggerUpload = (field: string) => {
    setUploadTarget(field);
    // Use requestAnimationFrame for more reliable click trigger on mobile
    requestAnimationFrame(() => {
      fileRef.current?.click();
    });
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
    }
    if (step === 4) {
      if (form.bank_account_number && (form.bank_account_number.length < 9 || form.bank_account_number.length > 18)) return "Bank account number must be 9-18 digits";
      if (form.bank_account_number && form.bank_account_number !== form.bank_confirm_account) return "Account numbers don't match";
      if (form.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.bank_ifsc)) return "IFSC code must be exactly 11 characters (e.g. SBIN0001234)";
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
      const payload = {
        user_id: form.email,
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
        latitude: form.latitude, longitude: form.longitude, shop_address: form.shop_address,
        status: 'submitted',
      };

      const { error } = await supabase.from('vendor_applications').insert(payload);
      if (error) throw error;
      toast.success("Application submitted! Our team will review within 48 hours.");
      navigate("/vendor/login");
    } catch (err: any) {
      toast.error(err.message || "Registration could not be completed. Please try again.");
    }
    setLoading(false);
  };

  const formCompletion = (() => {
    let filled = 0; const total = 8;
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

  const DocUploadButton = ({ field, label }: { field: string; label: string }) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => triggerUpload(field)}
        className="h-14 w-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
        {(form as any)[field] ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Upload className="h-4 w-4" />}
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <input type="file" ref={fileRef} className="hidden" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleFileChange} />

      {/* Simple header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/vendor/login">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1 h-7 w-7 flex items-center justify-center">
              <img src={p4uLogo} alt="P4U" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-base font-bold">Vendor Registration</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Step {step} of 5</p>
            <span className="text-sm font-bold text-primary">{formCompletion}%</span>
          </div>
          <Progress value={step * 20} className="h-2" />
          <div className="flex justify-between mt-2">
            {["Personal", "Business", "KYC", "Bank", "Review"].map((l, i) => (
              <button key={l} onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                className={`text-[10px] ${step === i + 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{l}</button>
            ))}
          </div>
        </Card>

        {/* Step 1: Personal */}
        {step === 1 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Personal Details</h3>
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
              <div><label className="text-xs font-medium text-muted-foreground">Facebook</label>
                <Input value={form.fb_link} onChange={e => updateField('fb_link', e.target.value)} placeholder="https://..." /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Instagram</label>
                <Input value={form.instagram_link} onChange={e => updateField('instagram_link', e.target.value)} placeholder="https://..." /></div>
            </div>
          </Card>
        )}

        {/* Step 2: Business */}
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
              <div><label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={form.category} onValueChange={v => updateField('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product Seller</SelectItem>
                    <SelectItem value="service">Service Provider</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Store Name</label>
                <Input value={form.store_name} onChange={e => updateField('store_name', e.target.value)} placeholder="Optional" /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Description</label>
                <RichTextEditor value={form.business_description} onChange={v => updateField('business_description', v)} placeholder="Describe your business..." minHeight="100px" compact />
                <p className="text-[10px] text-muted-foreground text-right">{form.business_description.length}/2000</p></div>
            </div>
            <DocUploadButton field="store_logo_url" label="Store Logo (optional)" />
            
            {/* Shop Location */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> Shop Location *</h4>
              <p className="text-[10px] text-muted-foreground">Your shop location is used for vendor discovery and delivery radius.</p>
              <Button type="button" variant="outline" size="sm" disabled={locating} onClick={() => {
                setLocating(true);
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      setForm(f => ({ ...f, latitude: lat, longitude: lng }));
                      // Reverse geocode
                      try {
                        const { data: vars } = await supabase.from('platform_variables').select('value').eq('key', 'google_maps_api_key').single();
                        const apiKey = vars?.value || '';
                        if (apiKey) {
                          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
                          const json = await res.json();
                          if (json.results?.[0]) {
                            setForm(f => ({ ...f, shop_address: json.results[0].formatted_address }));
                          }
                        }
                      } catch {}
                      toast.success("Location captured");
                      setLocating(false);
                    },
                    () => { toast.error("Location access denied"); setLocating(false); },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                } else {
                  toast.error("Geolocation not supported"); setLocating(false);
                }
              }}>
                {locating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                {form.latitude ? "Update Location" : "Capture Shop Location"}
              </Button>
              {form.latitude !== 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-1">
                  <p className="text-xs font-medium text-green-800">📍 Location captured</p>
                  <p className="text-[10px] text-green-700">{form.shop_address || `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`}</p>
                </div>
              )}
              <Input value={form.shop_address} onChange={e => updateField('shop_address', e.target.value)} placeholder="Or enter address manually" className="text-xs" />
            </div>
          </Card>
        )}

        {/* Step 3: KYC */}
        {step === 3 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">KYC Documents</h3>
            <p className="text-xs text-muted-foreground">Either Aadhaar or PAN is mandatory.</p>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">Aadhaar Card</h4>
                <Input value={form.aadhaar_number} onChange={e => updateField('aadhaar_number', e.target.value.replace(/\D/g, ''))} placeholder="12-digit Aadhaar" maxLength={12} />
                <DocUploadButton field="aadhaar_front_url" label="Front Image" />
                <DocUploadButton field="aadhaar_back_url" label="Back Image" />
              </div>
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">PAN Card</h4>
                <Input value={form.pan_number} onChange={e => updateField('pan_number', e.target.value.toUpperCase())} placeholder="10-char PAN" maxLength={10} />
                <DocUploadButton field="pan_image_url" label="PAN Image" />
              </div>
              <div className="p-3 rounded-lg border border-border space-y-3">
                <h4 className="text-xs font-bold">GST {form.category === 'product' ? '(Required)' : '(Optional)'}</h4>
                <Input value={form.gst_number} onChange={e => updateField('gst_number', e.target.value.toUpperCase())} placeholder="15-char GST" maxLength={15} />
                <DocUploadButton field="gst_certificate_url" label="GST Certificate" />
              </div>
              {form.category !== 'service' && (
                <div className="p-3 rounded-lg border border-border space-y-3">
                  <h4 className="text-xs font-bold">FSSAI (if food)</h4>
                  <DocUploadButton field="fssai_url" label="FSSAI Certificate" />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 4: Bank */}
        {step === 4 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Bank Verification</h3>
            <p className="text-xs text-muted-foreground">For settlement payouts.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
                <Input value={form.bank_holder_name} onChange={e => updateField('bank_holder_name', e.target.value)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Account Number (9-18 digits)</label>
                <Input value={form.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value.replace(/\D/g, ''))} maxLength={18} inputMode="numeric" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Confirm Account Number</label>
                <Input value={form.bank_confirm_account} onChange={e => updateField('bank_confirm_account', e.target.value.replace(/\D/g, ''))} maxLength={18} inputMode="numeric" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">IFSC Code (11 characters)</label>
                <Input value={form.bank_ifsc} onChange={e => updateField('bank_ifsc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={11} placeholder="e.g. SBIN0001234" /></div>
            </div>
            {form.bank_account_number && form.bank_confirm_account && form.bank_account_number !== form.bank_confirm_account && (
              <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Account numbers don't match</p>
            )}
          </Card>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Review & Submit</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-muted-foreground">Name</p><p className="font-medium">{form.name}</p>
                <p className="text-muted-foreground">Phone</p><p className="font-medium">{form.phone}</p>
                <p className="text-muted-foreground">Email</p><p className="font-medium">{form.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-muted-foreground">Business</p><p className="font-medium">{form.business_name}</p>
                <p className="text-muted-foreground">Type</p><p className="font-medium capitalize">{form.business_type}</p>
                <p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{form.category}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-muted-foreground">Aadhaar</p><p className="font-medium">{form.aadhaar_number ? `XXXX-XXXX-${form.aadhaar_number.slice(-4)}` : '—'}</p>
                <p className="text-muted-foreground">PAN</p><p className="font-medium">{form.pan_number ? `${form.pan_number.slice(0, 2)}XXXX${form.pan_number.slice(-2)}` : '—'}</p>
                <p className="text-muted-foreground">GST</p><p className="font-medium">{form.gst_number || '—'}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 h-12 rounded-xl">Back</Button>}
          {step < 5 ? (
            <Button onClick={handleNext} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">Next</Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
