import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foodApi, Rider } from "@/lib/food-api";
import { uploadToB2 } from "@/lib/b2-upload";
import { compressImageToWebp } from "@/lib/webp-compress";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Upload } from "lucide-react";

export default function RiderKYCPage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await foodApi.getMyRider();
      if (!r) { navigate('/rider/login'); return; }
      setRider(r);
      setForm({
        license_number: (r as any).license_number || "",
        license_image_url: (r as any).license_image_url || "",
        aadhaar_number: (r as any).aadhaar_number || "",
        aadhaar_image_url: (r as any).aadhaar_image_url || "",
        pan_number: (r as any).pan_number || "",
        pan_image_url: (r as any).pan_image_url || "",
        bank_account_number: (r as any).bank_account_number || "",
        bank_ifsc: (r as any).bank_ifsc || "",
        bank_holder_name: (r as any).bank_holder_name || "",
      });
      setLoading(false);
    })();
  }, [navigate]);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const handleUpload = async (field: string, file: File) => {
    setUploadingField(field);
    try {
      const blob = await compressImageToWebp(file, { maxDimension: 2048, quality: 0.7 });
      const result = await uploadToB2(blob, {
        folder: 'rider-kyc',
        filename: `${field}-${Date.now()}.webp`,
        contentType: 'image/webp',
        private: true,
      });
      set(field, result.publicUrl);
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const onSave = async () => {
    if (!rider) return;
    if (!form.license_image_url || !form.aadhaar_image_url || !form.bank_account_number || !form.bank_ifsc) {
      toast.error("Driving licence, Aadhaar and bank details are required"); return;
    }
    setSaving(true);
    try {
      await foodApi.updateRiderProfile(rider.id, { ...form, kyc_status: 'submitted' });
      toast.success("KYC submitted for review");
      navigate('/rider');
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!rider) return null;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate('/rider')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Rider KYC</h1>
          <p className="text-xs text-muted-foreground">Required to start receiving orders</p>
        </div>
        <Badge variant={rider.kyc_status === 'verified' ? 'default' : 'secondary'}>{rider.kyc_status}</Badge>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Driving Licence</h2>
          <div><Label>Licence Number</Label><Input value={form.license_number} onChange={e => set('license_number', e.target.value.toUpperCase())} placeholder="DL-1420110012345" /></div>
          <UploadRow field="license_image_url" value={form.license_image_url} onUpload={handleUpload} uploading={uploadingField === 'license_image_url'} />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Aadhaar</h2>
          <div><Label>Aadhaar Number</Label><Input value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="XXXX XXXX XXXX" /></div>
          <UploadRow field="aadhaar_image_url" value={form.aadhaar_image_url} onUpload={handleUpload} uploading={uploadingField === 'aadhaar_image_url'} />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />PAN (optional)</h2>
          <div><Label>PAN Number</Label><Input value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" /></div>
          <UploadRow field="pan_image_url" value={form.pan_image_url} onUpload={handleUpload} uploading={uploadingField === 'pan_image_url'} />
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Bank Account</h2>
          <div><Label>Account Holder Name</Label><Input value={form.bank_holder_name} onChange={e => set('bank_holder_name', e.target.value)} /></div>
          <div><Label>Account Number</Label><Input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value.replace(/\D/g, ''))} /></div>
          <div><Label>IFSC Code</Label><Input value={form.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value.toUpperCase())} placeholder="HDFC0000123" /></div>
        </Card>

        <Button onClick={onSave} disabled={saving} className="w-full h-11">{saving ? "Saving…" : "Submit KYC"}</Button>
      </div>
    </div>
  );
}

function UploadRow({ field, value, onUpload, uploading }: { field: string; value: string; onUpload: (f: string, file: File) => void; uploading: boolean }) {
  return (
    <div>
      <Label className="block mb-1.5">Document Photo</Label>
      <label className="block">
        <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onUpload(field, e.target.files[0])} />
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition">
          {uploading ? (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          ) : value ? (
            <p className="text-xs text-primary font-medium">✓ Uploaded — tap to replace</p>
          ) : (
            <div className="space-y-1">
              <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Tap to upload</p>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
