import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { foodApi } from "@/lib/food-api";
import { PrivateKycImage } from "@/components/admin/PrivateKycImage";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { CheckCircle2, XCircle } from "lucide-react";

export default function AdminRiderKYCPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setList(await foodApi.listRiders());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (riderId: string, status: 'verified' | 'rejected') => {
    try {
      await foodApi.adminUpdateRiderKyc(riderId, status);
      toast.success(status === 'verified' ? "Rider approved" : "Rider rejected");
      setView(null); load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const buckets = {
    pending: list.filter(r => ['pending', 'submitted'].includes(r.kyc_status)),
    verified: list.filter(r => r.kyc_status === 'verified'),
    rejected: list.filter(r => r.kyc_status === 'rejected'),
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Rider KYC Review</h1>
        <p className="page-description">Approve or reject rider documents</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({buckets.pending.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({buckets.verified.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({buckets.rejected.length})</TabsTrigger>
        </TabsList>

        {(['pending', 'verified', 'rejected'] as const).map(b => (
          <TabsContent key={b} value={b} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {buckets[b].length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No riders here.</p>}
            {buckets[b].map(r => (
              <Card key={r.id} className="p-4 space-y-2 cursor-pointer hover:shadow-md transition" onClick={() => setView(r)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.mobile} • {r.vehicle_type}</p>
                  </div>
                  <Badge variant={r.kyc_status === 'verified' ? 'default' : r.kyc_status === 'rejected' ? 'destructive' : 'secondary'}>{r.kyc_status}</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{view?.name} — KYC Documents</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Mobile:</span> {view.mobile}</div>
                <div><span className="text-muted-foreground">Email:</span> {view.email || '—'}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {view.vehicle_type} {view.vehicle_number || ''}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{view.kyc_status}</Badge></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <DocBlock label="Driving Licence" number={view.license_number} url={view.license_image_url} />
                <DocBlock label="Aadhaar" number={view.aadhaar_number} url={view.aadhaar_image_url} />
                <DocBlock label="PAN" number={view.pan_number} url={view.pan_image_url} />
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Bank Details</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Holder</span>{view.bank_holder_name || '—'}</div>
                  <div><span className="text-muted-foreground block text-xs">Account</span>{view.bank_account_number || '—'}</div>
                  <div><span className="text-muted-foreground block text-xs">IFSC</span>{view.bank_ifsc || '—'}</div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Button variant="outline" className="flex-1" onClick={() => decide(view.id, 'rejected')}>
                  <XCircle className="h-4 w-4 mr-1" />Reject
                </Button>
                <Button className="flex-1" onClick={() => decide(view.id, 'verified')}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DocBlock({ label, number, url }: { label: string; number?: string; url?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {url ? <PrivateKycImage value={url} alt={label} className="w-full h-32 object-cover rounded border" /> : <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>}
      {number && <p className="text-xs font-mono">{number}</p>}
    </div>
  );
}
