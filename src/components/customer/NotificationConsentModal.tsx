import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { registerPush } from "@/lib/device-service";
import { toast } from "sonner";

interface NotificationConsentModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function NotificationConsentModal({ open, onClose, userId }: NotificationConsentModalProps) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const token = await registerPush(userId);
      if (token) {
        toast.success("Notifications enabled!");
      } else {
        toast.info("Notifications permission denied or unavailable");
      }
    } catch {
      toast.error("Failed to enable notifications");
    } finally {
      setLoading(false);
      localStorage.setItem("p4u_notif_consent_shown", "true");
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("p4u_notif_consent_shown", "true");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">Enable Notifications</DialogTitle>
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Enable Notifications</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Get rewards, offers, order updates, and messages in real-time.
          </p>
          <div className="flex flex-col gap-2 w-full mt-6">
            <Button onClick={handleAllow} disabled={loading} className="w-full">
              {loading ? "Enabling..." : "Allow Notifications"}
            </Button>
            <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
