import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, Clock, Upload, FileText, Camera, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/activity-log";
import { supabase } from "@/integrations/supabase/client";
import { compressToWebP } from "@/lib/webp-compress";
import { useAuth } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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

export default function CustomerKYCPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const [docs, setDocs] = useState<KYCDoc[]>([
    { type: 'aadhaar', label: 'Aadhaar Card', status: 'not_submitted' },
    { type: 'pan', label: 'PAN Card', status: 'not_submitted' },
  ]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [frontFile, setFrontFile] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customerId) loadKYCDocs();
  }, [customerId]);

  const loadKYCDocs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', customerId);
      
      const docMap: Record<string, any> = {};
      (data || []).forEach((d: any) => { docMap[d.document_type] = d; });

      setDocs([
        {
          type: 'aadhaar', label: 'Aadhaar Card',
          id: docMap.aadhaar?.id,
          status: docMap.aadhaar?.status || 'not_submitted',
          number: docMap.aadhaar?.document_number,
          front_url: docMap.aadhaar?.front_image_url,
          back_url: docMap.aadhaar?.back_image_url,
          rejection_reason: docMap.aadhaar?.rejection_reason,
        },
        {
          type: 'pan', label: 'PAN Card',
          id: docMap.pan?.id,
          status: docMap.pan?.status || 'not_submitted',
          number: docMap.pan?.document_number,
          front_url: docMap.pan?.front_image_url,
          rejection_reason: docMap.pan?.rejection_reason,
        },
      ]);
    } catch { }
    setLoading(false);
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, JPEG, PNG, and PDF files are allowed");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 2MB");
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File, side: string): Promise<string | null> => {
    if (!validateFile(file)) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please log in"); return null; }

    const isImage = file.type.startsWith('image/');
    const { blob, contentType } = isImage ? await compressToWebP(file) : { blob: file as Blob, contentType: file.type };
    const ext = isImage ? 'webp' : (file.name.split('.').pop()?.toLowerCase() || 'pdf');
    const fileName = `${user.id}/kyc-${Date.now()}-${side}.${ext}`;

    const { error } = await supabase.storage.from('kyc-documents').upload(fileName, blob, { contentType });
    if (error) { toast.error("Upload failed: " + error.message); return null; }

    const { data: signedData } = await supabase.storage.from('kyc-documents').createSignedUrl(fileName, 365 * 24 * 3600);
    return signedData?.signedUrl || '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file, side);
    if (url) {
      if (side === 'front') setFrontFile(url);
      else setBackFile(url);
      toast.success(`${side === 'front' ? 'Front' : 'Back'} uploaded ✓`);
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const maskNumber = (num: string, type: string) => {
    if (!num) return '';
    if (type === 'aadhaar' && num.length === 12) return `XXXX-XXXX-${num.slice(-4)}`;
    if (type === 'pan' && num.length === 10) return `${num.slice(0, 2)}XXXXXX${num.slice(-2)}`;
    return num;
  };

  const validateDocNumber = (num: string, type: string): string | null => {
    if (type === 'aadhaar') {
      if (!/^\d{12}$/.test(num)) return "Aadhaar must be exactly 12 digits";
    } else if (type === 'pan') {
      if (!/^[A-Z0-9]{10}$/i.test(num)) return "PAN must be exactly 10 alphanumeric characters";
    }
    return null;
  };

  const submitDoc = async (type: string) => {
    const numErr = validateDocNumber(docNumber, type);
    if (numErr) { toast.error(numErr); return; }
    if (!frontFile) { toast.error("Please upload front image"); return; }
    if (type === 'aadhaar' && !backFile) { toast.error("Please upload back image of Aadhaar"); return; }

    setUploading(true);
    try {
      const existing = docs.find(d => d.type === type);
      const payload = {
        user_id: customerId,
        document_type: type,
        document_number: docNumber.toUpperCase(),
        front_image_url: frontFile,
        back_image_url: backFile || '',
        status: 'submitted',
      };

      if (existing?.id) {
        await supabase.from('kyc_documents').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('kyc_documents').insert(payload);
      }

      // Update customer kyc_status
      await supabase.from('customers').update({ kyc_status: 'in_progress' }).eq('id', customerId);

      setSelectedDoc(null);
      setDocNumber("");
      setFrontFile(null);
      setBackFile(null);
      logActivity('kyc_submit', `KYC document submitted: ${type}`);
      toast.success("Document submitted for verification! Admin will review within 24-48 hours.");
      await loadKYCDocs();
    } catch {
      toast.error("Failed to submit document");
    }
    setUploading(false);
  };

  const statusIcon = (s: string) => {
    if (s === 'verified') return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === 'submitted' || s === 'in_progress') return <Clock className="h-4 w-4 text-warning" />;
    if (s === 'rejected') return <AlertCircle className="h-4 w-4 text-destructive" />;
    return <Upload className="h-4 w-4 text-muted-foreground" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'verified') return 'bg-success/10 text-success';
    if (s === 'submitted' || s === 'in_progress') return 'bg-warning/10 text-warning';
    if (s === 'rejected') return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      not_submitted: 'Not Submitted', submitted: 'Under Review',
      in_progress: 'In Progress', verified: 'Verified', rejected: 'Rejected',
    };
    return labels[s] || s;
  };

  // Profile completeness
  const completeness = (() => {
    let score = 0;
    if (customerUser?.mobile) score += 20;
    if (customerUser?.name) score += 10;
    const hasVerifiedDoc = docs.some(d => d.status === 'verified');
    if (hasVerifiedDoc) score += 15;
    return score;
  })();

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">KYC Verification</h1>
        </div>

        {/* Profile Completeness */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Profile Completeness</p>
            <span className="text-sm font-bold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">Complete KYC to unlock full access</p>
        </Card>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Identity Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">Submit either Aadhaar or PAN card. Upload clear JPG, PNG, or PDF files (max 2MB each). Admin will verify within 24-48 hours.</p>
            </div>
          </div>
        </Card>

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
                    {doc.number && <p className="text-xs text-muted-foreground">{maskNumber(doc.number, doc.type)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(doc.status)}
                  <Badge className={`${statusBadge(doc.status)} border-0 text-[10px]`}>
                    {statusLabel(doc.status)}
                  </Badge>
                </div>
              </div>

              {/* Show uploaded images for submitted/verified docs */}
              {(doc.status === 'submitted' || doc.status === 'verified' || doc.status === 'in_progress') && (doc.front_url || doc.back_url) && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {doc.front_url && (
                    <div className="h-20 w-20 rounded-lg overflow-hidden border border-border">
                      <img src={doc.front_url} alt="Front" className="h-full w-full object-cover" />
                    </div>
                  )}
                  {doc.back_url && (
                    <div className="h-20 w-20 rounded-lg overflow-hidden border border-border">
                      <img src={doc.back_url} alt="Back" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {(doc.status === 'not_submitted' || doc.status === 'rejected') && selectedDoc !== doc.type && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setSelectedDoc(doc.type); setDocNumber(doc.number || ""); }}>
                  {doc.status === 'rejected' ? 'Resubmit Document' : 'Submit Document'}
                </Button>
              )}

              {selectedDoc === doc.type && (
                <div className="mt-3 space-y-3">
                  <Input
                    placeholder={doc.type === 'aadhaar' ? 'Enter 12-digit Aadhaar Number' : 'Enter 10-char PAN Number'}
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value)}
                    maxLength={doc.type === 'aadhaar' ? 12 : 10}
                    className="h-10"
                  />
                  
                  {/* Front image upload */}
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
                          <button type="button" onClick={() => setFrontFile(null)}
                            className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF, max 2MB</p>
                    </div>
                    <input ref={frontRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={e => handleFileUpload(e, 'front')} />
                  </div>

                  {/* Back image upload (Aadhaar only) */}
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
                            <button type="button" onClick={() => setBackFile(null)}
                              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF, max 2MB</p>
                      </div>
                      <input ref={backRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={e => handleFileUpload(e, 'back')} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitDoc(doc.type)} className="flex-1 bg-primary" disabled={uploading}>Submit</Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedDoc(null); setDocNumber(""); setFrontFile(null); setBackFile(null); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {doc.status === 'submitted' && (
                <p className="text-[10px] text-warning mt-2">⏳ Under review by admin. You will be notified once verified.</p>
              )}
              {doc.status === 'verified' && (
                <p className="text-[10px] text-success mt-2">✅ Verified by admin</p>
              )}
              {doc.status === 'rejected' && (
                <p className="text-[10px] text-destructive mt-2">❌ {doc.rejection_reason || 'Verification failed. Please resubmit with correct documents.'}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
