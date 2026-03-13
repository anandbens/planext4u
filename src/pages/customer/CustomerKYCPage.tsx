import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, Clock, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { logActivity } from "@/lib/auth";

interface KYCDoc {
  type: string; label: string; status: 'pending' | 'verified' | 'not_submitted'; number?: string;
}

export default function CustomerKYCPage() {
  const [docs, setDocs] = useState<KYCDoc[]>([
    { type: 'aadhaar', label: 'Aadhaar Card', status: 'verified', number: 'XXXX-XXXX-4321' },
    { type: 'pan', label: 'PAN Card', status: 'pending', number: 'ABCDE1234F' },
    { type: 'gst', label: 'GST Number', status: 'not_submitted' },
    { type: 'address', label: 'Address Proof', status: 'not_submitted' },
  ]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState("");

  const submitDoc = (type: string) => {
    if (!docNumber.trim()) { toast.error("Please enter document number"); return; }
    setDocs(docs.map(d => d.type === type ? { ...d, status: 'pending' as const, number: docNumber } : d));
    setSelectedDoc(null);
    setDocNumber("");
    logActivity('kyc_submit', `KYC document submitted: ${type}`);
    toast.success("Document submitted for verification! Verification via Hyperverge will complete in 24-48 hours.");
  };

  const statusIcon = (s: string) => s === 'verified' ? <CheckCircle className="h-4 w-4 text-success" /> : s === 'pending' ? <Clock className="h-4 w-4 text-warning" /> : <Upload className="h-4 w-4 text-muted-foreground" />;
  const statusBadge = (s: string) => s === 'verified' ? 'bg-success/10 text-success' : s === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground';

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">KYC Verification</h1>
        </div>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Identity Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">Complete your KYC to unlock higher order limits, faster refunds, and exclusive offers. Powered by Hyperverge for instant verification.</p>
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitDoc(doc.type)} className="flex-1 bg-primary">Submit</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedDoc(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
