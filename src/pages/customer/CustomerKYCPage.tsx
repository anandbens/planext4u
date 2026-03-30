import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, Clock, Upload, FileText, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface KYCDoc {
  type: string; label: string; status: 'pending' | 'verified' | 'not_submitted'; number?: string; fileUrl?: string;
}

export default function CustomerKYCPage() {
  const [docs, setDocs] = useState<KYCDoc[]>([
    { type: 'aadhaar', label: 'Aadhaar Card', status: 'not_submitted' },
    { type: 'pan', label: 'PAN Card', status: 'not_submitted' },
    { type: 'address', label: 'Address Proof', status: 'not_submitted' },
  ]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    
    setUploading(true);
    try {
      const fileName = `kyc/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('classified-images').upload(fileName, file, { contentType: file.type });
      if (error) { toast.error("Upload failed"); return; }
      const { data: urlData } = supabase.storage.from('classified-images').getPublicUrl(fileName);
      setUploadedFile(urlData.publicUrl);
      toast.success("Document uploaded ✓");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submitDoc = (type: string) => {
    if (!docNumber.trim()) { toast.error("Please enter document number"); return; }
    setDocs(docs.map(d => d.type === type ? { ...d, status: 'pending' as const, number: docNumber, fileUrl: uploadedFile || undefined } : d));
    setSelectedDoc(null);
    setDocNumber("");
    setUploadedFile(null);
    logActivity('kyc_submit', `KYC document submitted: ${type}`);
    toast.success("Document submitted for verification! Admin will review within 24-48 hours.");
  };

  const statusIcon = (s: string) => s === 'verified' ? <CheckCircle className="h-4 w-4 text-success" /> : s === 'pending' ? <Clock className="h-4 w-4 text-warning" /> : <Upload className="h-4 w-4 text-muted-foreground" />;
  const statusBadge = (s: string) => s === 'verified' ? 'bg-success/10 text-success' : s === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground';

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">KYC Verification</h1>
        </div>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Identity Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">Complete your KYC to unlock higher order limits, faster refunds, and exclusive offers. Upload your documents and admin will verify them.</p>
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
                    {doc.number && <p className="text-xs text-muted-foreground">{doc.number}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(doc.status)}
                  <Badge className={`${statusBadge(doc.status)} border-0 text-[10px]`}>
                    {doc.status === 'not_submitted' ? 'Not Submitted' : doc.status}
                  </Badge>
                </div>
              </div>

              {doc.status === 'not_submitted' && selectedDoc !== doc.type && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setSelectedDoc(doc.type)}>
                  Submit Document
                </Button>
              )}

              {selectedDoc === doc.type && (
                <div className="mt-3 space-y-3">
                  <Input placeholder={`Enter ${doc.label} Number`} value={docNumber} onChange={e => setDocNumber(e.target.value)} className="h-10" />
                  
                  {/* File upload */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Upload {doc.label} scan/photo</p>
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        <span className="text-[9px]">{uploading ? "..." : "Upload"}</span>
                      </button>
                      {uploadedFile && (
                        <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-border shrink-0">
                          <img src={uploadedFile} alt="Doc" className="h-full w-full object-cover" />
                          <button type="button" onClick={() => setUploadedFile(null)}
                            className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF, max 5MB</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitDoc(doc.type)} className="flex-1 bg-primary" disabled={uploading}>Submit</Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedDoc(null); setDocNumber(""); setUploadedFile(null); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {doc.status === 'pending' && (
                <p className="text-[10px] text-warning mt-2">⏳ Under review by admin. You will be notified once verified.</p>
              )}
              {doc.status === 'verified' && (
                <p className="text-[10px] text-success mt-2">✅ Verified by admin</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
