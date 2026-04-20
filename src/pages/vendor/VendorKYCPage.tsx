import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, Clock, Upload, FileText, Camera, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface KYCDoc {
  id?: string;
  type: string;
  label: string;
  status: string;
  number?: string;
  front_url?: string;
  back_url?: string;
  rejection_reason?: string;
}

export default function VendorKYCPage() {
  const navigate = useNavigate();
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "";
  const [docs, setDocs] = useState<KYCDoc[]>([
    { type: 'aadhaar', label: 'Aadhaar Card', status: 'not_submitted' },
    { type: 'pan', label: 'PAN Card', status: 'not_submitted' },
    { type: 'gst', label: 'GST Certificate', status: 'not_submitted' },
  ]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [frontFile, setFrontFile] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (vendorId) loadKYCDocs(); }, [vendorId]);

  const loadKYCDocs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('kyc_documents').select('*').eq('user_id', vendorId);
      const docMap: Record<string, any> = {};
      (data || []).forEach((d: any) => { docMap[d.document_type] = d; });
      setDocs([
        { type: 'aadhaar', label: 'Aadhaar Card', id: docMap.aadhaar?.id, status: docMap.aadhaar?.status || 'not_submitted', number: docMap.aadhaar?.document_number, front_url: docMap.aadhaar?.front_image_url, back_url: docMap.aadhaar?.back_image_url, rejection_reason: docMap.aadhaar?.rejection_reason },
        { type: 'pan', label: 'PAN Card', id: docMap.pan?.id, status: docMap.pan?.status || 'not_submitted', number: docMap.pan?.document_number, front_url: docMap.pan?.front_image_url, rejection_reason: docMap.pan?.rejection_reason },
        { type: 'gst', label: 'GST Certificate', id: docMap.gst?.id, status: docMap.gst?.status || 'not_submitted', number: docMap.gst?.document_number, front_url: docMap.gst?.front_image_url, rejection_reason: docMap.gst?.rejection_reason },
      ]);
    } catch { }
    setLoading(false);
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, or PDF allowed"); return false; }
    if (file.size > MAX_FILE_SIZE) { toast.error("File must be under 2MB"); return false; }
    return true;
  };

  const uploadFile = async (file: File, side: string): Promise<string | null> => {
    if (!validateFile(file)) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please log in"); return null; }
    const isImage = file.type.startsWith('image/');
    const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
    const ext = isImage ? 'webp' : (file.name.split('.').pop()?.toLowerCase() || 'pdf');
    try {
      const { uploadToB2 } = await import("@/lib/b2-upload");
      // KYC docs go to the PRIVATE B2 bucket — admin-only access.
      const { publicUrl } = await uploadToB2(blob, {
        folder: `kyc-documents/vendor-kyc`,
        filename: `${side}.${ext}`,
        contentType,
        private: true,
      });
      return publicUrl;
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "unknown"));
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file, side);
    if (url) {
      if (side === 'front') setFrontFile(url); else setBackFile(url);
      toast.success(`${side === 'front' ? 'Front' : 'Back'} uploaded ✓`);
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const submitDoc = async (type: string) => {
    if (!docNumber.trim()) { toast.error("Please enter the document number"); return; }
    if (!frontFile) { toast.error("Please upload the document image"); return; }
    if (type === 'aadhaar' && !backFile) { toast.error("Please upload back image of Aadhaar"); return; }

    setUploading(true);
    try {
      const existing = docs.find(d => d.type === type);
      const payload = {
        user_id: vendorId,
        document_type: type,
        document_number: docNumber.toUpperCase(),
        front_image_url: frontFile,
        back_image_url: backFile || '',
        status: 'submitted',
        rejection_reason: null,
      };
      if (existing?.id) {
        await supabase.from('kyc_documents').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('kyc_documents').insert(payload);
      }
      await supabase.from('vendors').update({ kyc_status: 'in_progress' } as any).eq('id', vendorId);
      setSelectedDoc(null); setDocNumber(""); setFrontFile(null); setBackFile(null);
      toast.success("Document submitted! Admin will review within 24-48 hours.");
      await loadKYCDocs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit document");
    }
    setUploading(false);
  };

  const statusIcon = (s: string) => s === 'verified' ? <CheckCircle className="h-4 w-4 text-success" /> : s === 'rejected' ? <AlertCircle className="h-4 w-4 text-destructive" /> : (s === 'submitted' || s === 'in_progress') ? <Clock className="h-4 w-4 text-warning" /> : <Upload className="h-4 w-4 text-muted-foreground" />;
  const statusBadge = (s: string) => s === 'verified' ? 'bg-success/10 text-success' : s === 'rejected' ? 'bg-destructive/10 text-destructive' : (s === 'submitted' || s === 'in_progress') ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground';
  const statusLabel = (s: string) => ({ not_submitted: 'Not Submitted', submitted: 'Under Review', in_progress: 'In Progress', verified: 'Verified', rejected: 'Rejected' } as Record<string, string>)[s] || s;

  return (
    <VendorLayout title="KYC Verification">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/profile')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold">KYC Verification</h1>
        </div>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Vendor Identity Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">Submit Aadhaar, PAN, and (optionally) GST. Admin will verify within 24-48 hours. Rejected documents can be resubmitted.</p>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <Card key={doc.type} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{doc.label}</p>
                      {doc.number && <p className="text-xs text-muted-foreground">{doc.number}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(doc.status)}
                    <Badge className={`${statusBadge(doc.status)} border-0 text-[10px]`}>{statusLabel(doc.status)}</Badge>
                  </div>
                </div>

                {(doc.status === 'submitted' || doc.status === 'verified' || doc.status === 'in_progress') && (doc.front_url || doc.back_url) && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {doc.front_url && <div className="h-20 w-20 rounded-lg overflow-hidden border border-border"><img src={doc.front_url} alt="Front" className="h-full w-full object-cover" /></div>}
                    {doc.back_url && <div className="h-20 w-20 rounded-lg overflow-hidden border border-border"><img src={doc.back_url} alt="Back" className="h-full w-full object-cover" /></div>}
                  </div>
                )}

                {doc.status === 'rejected' && doc.rejection_reason && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive mb-1">Rejection Reason</p>
                    <p className="text-xs text-destructive/90">{doc.rejection_reason}</p>
                  </div>
                )}

                {(doc.status === 'not_submitted' || doc.status === 'rejected') && selectedDoc !== doc.type && (
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setSelectedDoc(doc.type); setDocNumber(doc.number || ""); setFrontFile(null); setBackFile(null); }}>
                    {doc.status === 'rejected' ? 'Resubmit Document' : 'Submit Document'}
                  </Button>
                )}

                {selectedDoc === doc.type && (
                  <div className="mt-3 space-y-3">
                    <Input placeholder={`Enter ${doc.label} Number`} value={docNumber} onChange={e => setDocNumber(e.target.value)} className="h-10" />
                    <div>
                      <p className="text-xs font-medium mb-1.5">Front Image *</p>
                      <div className="flex gap-3 items-center flex-wrap">
                        <button type="button" onClick={() => frontRef.current?.click()} disabled={uploading}
                          className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                          <span className="text-[10px]">{uploading ? "..." : "Upload"}</span>
                        </button>
                        {frontFile && (
                          <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-border shrink-0">
                            <img src={frontFile} alt="Front" className="h-full w-full object-cover" />
                            <button type="button" onClick={() => setFrontFile(null)} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                      <input ref={frontRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={e => handleFileUpload(e, 'front')} />
                    </div>
                    {doc.type === 'aadhaar' && (
                      <div>
                        <p className="text-xs font-medium mb-1.5">Back Image *</p>
                        <div className="flex gap-3 items-center flex-wrap">
                          <button type="button" onClick={() => backRef.current?.click()} disabled={uploading}
                            className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
                            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                            <span className="text-[10px]">{uploading ? "..." : "Upload"}</span>
                          </button>
                          {backFile && (
                            <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-border shrink-0">
                              <img src={backFile} alt="Back" className="h-full w-full object-cover" />
                              <button type="button" onClick={() => setBackFile(null)} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                        <input ref={backRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={e => handleFileUpload(e, 'back')} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitDoc(doc.type)} className="flex-1" disabled={uploading}>Submit</Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDoc(null); setDocNumber(""); setFrontFile(null); setBackFile(null); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
