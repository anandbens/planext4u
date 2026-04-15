import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Camera, CheckCircle, Clock, Upload } from "lucide-react";

const statusStyle: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-info/10 text-info",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function VendorBookingsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [completionModal, setCompletionModal] = useState<any>(null);
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["vendorBookings", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_bookings")
        .select("*, services:service_id(title, image, price)")
        .eq("vendor_id", vendorId)
        .order("booking_date", { ascending: false });
      return data || [];
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompletionPhoto(file);
      setCompletionPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitCompletion = async () => {
    if (!completionModal || !completionPhoto) {
      toast.error("Please upload a completion photo");
      return;
    }
    setUploading(true);
    try {
      // Upload photo to storage
      const ext = completionPhoto.name.split('.').pop();
      const path = `service-completions/${completionModal.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("vendor-assets")
        .upload(path, completionPhoto, { contentType: completionPhoto.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("vendor-assets").getPublicUrl(path);

      // Update booking
      await supabase.from("service_bookings").update({
        completion_photo_url: urlData.publicUrl,
        completion_notes: completionNotes.trim() || null,
        vendor_completion_confirmed: true,
        vendor_completion_confirmed_at: new Date().toISOString(),
        status: "completed",
        updated_at: new Date().toISOString(),
      } as any).eq("id", completionModal.id);

      toast.success("Service completion submitted!");
      setCompletionModal(null);
      setCompletionPhoto(null);
      setCompletionPhotoPreview("");
      setCompletionNotes("");
      qc.invalidateQueries({ queryKey: ["vendorBookings"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("service_bookings").update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["vendorBookings"] });
    },
  });

  const pending = (bookings || []).filter((b: any) => b.status === 'pending' || b.status === 'confirmed');
  const active = (bookings || []).filter((b: any) => b.status === 'in_progress');
  const completed = (bookings || []).filter((b: any) => b.status === 'completed' || b.status === 'cancelled');

  const BookingCard = ({ b }: { b: any }) => {
    const service = b.services;
    const canComplete = b.status === 'in_progress';
    const canStart = b.status === 'confirmed';

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{service?.title || 'Service'}</p>
            <p className="text-xs text-muted-foreground">{new Date(b.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.start_time} - {b.end_time}</p>
          </div>
          <Badge className={`${statusStyle[b.status] || ''} border-0 text-[10px]`}>{b.status.replace("_", " ")}</Badge>
        </div>

        {b.notes && <p className="text-xs text-muted-foreground mb-2">Note: {b.notes}</p>}

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">₹{(b.total_amount || service?.price || 0).toLocaleString()}</p>
          <div className="flex gap-2">
            {b.status === 'pending' && (
              <>
                <Button size="sm" className="h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'confirmed' })}>Accept</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'cancelled' })}>Reject</Button>
              </>
            )}
            {canStart && (
              <Button size="sm" className="h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'in_progress' })}>
                <Clock className="h-3 w-3 mr-1" /> Start Service
              </Button>
            )}
            {canComplete && (
              <Button size="sm" className="h-7 text-xs" onClick={() => { setCompletionModal(b); setCompletionNotes(""); setCompletionPhoto(null); setCompletionPhotoPreview(""); }}>
                <Camera className="h-3 w-3 mr-1" /> Complete with Photo
              </Button>
            )}
          </div>
        </div>

        {/* Completion photo display */}
        {b.completion_photo_url && (
          <div className="mt-2 p-2 bg-success/5 rounded-lg">
            <p className="text-xs font-medium text-success mb-1">✅ Completion Photo</p>
            <img src={b.completion_photo_url} alt="Completion" className="h-20 rounded object-cover" />
            {b.completion_notes && <p className="text-xs text-muted-foreground mt-1">{b.completion_notes}</p>}
          </div>
        )}

        {/* Customer POD status */}
        {b.customer_pod_confirmed != null && (
          <div className={`mt-2 p-2 rounded text-xs ${b.customer_pod_confirmed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {b.customer_pod_confirmed ? '✅ Customer confirmed service completion' : '❌ Customer reported issue'}
          </div>
        )}
      </Card>
    );
  };

  return (
    <VendorLayout title="Service Bookings">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-warning">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
          <Card className="p-3 text-center">
            <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{active.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
        </div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (bookings || []).length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No service bookings yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-warning">Pending / Confirmed ({pending.length})</h3>
                {pending.map((b: any) => <BookingCard key={b.id} b={b} />)}
              </>
            )}
            {active.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-primary mt-4">In Progress ({active.length})</h3>
                {active.map((b: any) => <BookingCard key={b.id} b={b} />)}
              </>
            )}
            {completed.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-success mt-4">Completed / Cancelled ({completed.length})</h3>
                {completed.map((b: any) => <BookingCard key={b.id} b={b} />)}
              </>
            )}
          </div>
        )}
      </div>

      {/* Completion Photo Upload Modal */}
      <Dialog open={!!completionModal} onOpenChange={() => setCompletionModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Submit Completion Photo
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Upload a photo of the completed service as proof of delivery. This will be visible to the customer and admin.</p>

            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              {completionPhotoPreview ? (
                <div className="relative">
                  <img src={completionPhotoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                  <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => { setCompletionPhoto(null); setCompletionPhotoPreview(""); }}>
                    Change Photo
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to upload photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                </label>
              )}
            </div>

            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="Any notes about the service completion..." value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} className="mt-1" rows={2} />
            </div>

            <Button className="w-full" onClick={handleSubmitCompletion} disabled={!completionPhoto || uploading}>
              {uploading ? "Uploading..." : "Submit Completion ✓"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
