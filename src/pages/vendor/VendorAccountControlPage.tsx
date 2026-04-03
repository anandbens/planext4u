import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function VendorAccountControlPage() {
  const navigate = useNavigate();
  const { vendorUser, vendorLogout } = useAuth();
  const [selected, setSelected] = useState<"deactivate" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!selected) {
      toast.error("Please select an option");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!vendorUser) return;
    setLoading(true);
    try {
      const vendorId = vendorUser.vendor_id || vendorUser.id;

      if (selected === "deactivate") {
        await supabase
          .from("vendors")
          .update({ status: "deactivated" })
          .eq("id", vendorId);

        await supabase.from("audit_logs").insert({
          table_name: "vendors",
          operation: "DEACTIVATE",
          record_id: vendorId,
          new_data: { reason, action: "self_deactivate" },
        });

        toast.success("Your vendor account has been deactivated. Contact admin to reactivate.");
        await vendorLogout();
        navigate("/vendor/login", { replace: true });
      } else {
        await supabase
          .from("vendors")
          .update({ status: "deleted" })
          .eq("id", vendorId);

        await supabase.from("audit_logs").insert({
          table_name: "vendors",
          operation: "DELETE_REQUEST",
          record_id: vendorId,
          new_data: { reason, action: "self_delete_request" },
        });

        toast.success("Your account deletion has been requested. It will be permanently removed within 30 days.");
        await vendorLogout();
        navigate("/vendor/login", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <VendorLayout title="Account Ownership & Control">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Deactivating or deleting your P4U vendor account</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you want to take a break from selling on P4U, you can temporarily deactivate your vendor account. 
              If you want to permanently delete your account, let us know. Your products and services will be removed from the marketplace.
            </p>
          </div>

          {/* Deactivate Option */}
          <Card
            className={`p-5 cursor-pointer transition-all border-2 ${
              selected === "deactivate" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
            onClick={() => setSelected("deactivate")}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1">Deactivate account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Deactivating your vendor account is temporary,</span>{" "}
                  and it means your store, products, and services will be hidden on P4U until you contact the admin to reactivate your account.
                </p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                selected === "deactivate" ? "border-primary" : "border-muted-foreground/40"
              }`}>
                {selected === "deactivate" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
            </div>
          </Card>

          {/* Delete Option */}
          <Card
            className={`p-5 cursor-pointer transition-all border-2 ${
              selected === "delete" ? "border-destructive bg-destructive/5" : "border-border hover:border-destructive/40"
            }`}
            onClick={() => setSelected("delete")}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1">Delete account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Deleting your vendor account is permanent.</span>{" "}
                  When you delete your P4U vendor account, your store, products, services, order history, and settlements data will be permanently removed. 
                  If you'd just like to take a break, you can temporarily deactivate your account.
                </p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                selected === "delete" ? "border-destructive" : "border-muted-foreground/40"
              }`}>
                {selected === "delete" && <div className="h-2.5 w-2.5 rounded-full bg-destructive" />}
              </div>
            </div>
          </Card>

          {/* Reason */}
          {selected && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder={`Why would you like to ${selected === "deactivate" ? "deactivate" : "delete"} your vendor account?`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl"
                rows={3}
              />
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full h-12 rounded-xl text-base"
            variant={selected === "delete" ? "destructive" : "default"}
          >
            Continue
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${selected === "delete" ? "text-destructive" : "text-warning"}`} />
                {selected === "deactivate" ? "Deactivate Vendor Account?" : "Delete Vendor Account?"}
              </DialogTitle>
              <DialogDescription>
                {selected === "deactivate"
                  ? "Your store and all listings will be hidden. You'll be logged out. Contact admin to reactivate."
                  : "This action is permanent and cannot be undone after 30 days. All your vendor data including products, services, orders, and settlement history will be permanently removed."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                variant={selected === "delete" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-xl"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {selected === "deactivate" ? "Deactivate" : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </VendorLayout>
  );
}
