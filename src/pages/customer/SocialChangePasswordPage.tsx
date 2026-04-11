import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";

export default function SocialChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!currentPw) { toast.error("Enter current password"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (currentPw === newPw) { toast.error("New password must be different"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated successfully");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Change Password</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        <p className="text-sm text-muted-foreground">Your password must be at least 8 characters and should include a mix of letters, numbers, and symbols.</p>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Password</label>
          <div className="relative mt-1">
            <Input type={showCurrent ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrent(v => !v)}>
              {showCurrent ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</label>
          <div className="relative mt-1">
            <Input type={showNew ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Enter new password" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNew(v => !v)}>
              {showNew ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          {newPw && newPw.length < 8 && <p className="text-[10px] text-destructive mt-1">Must be at least 8 characters</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
          <div className="relative mt-1">
            <Input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          {confirmPw && confirmPw !== newPw && <p className="text-[10px] text-destructive mt-1">Passwords do not match</p>}
        </div>

        <Button className="w-full" disabled={saving || !currentPw || newPw.length < 8 || newPw !== confirmPw} onClick={handleSubmit}>
          {saving ? "Updating..." : "Update Password"}
        </Button>

        <button onClick={() => navigate("/app/forgot-password")} className="text-sm text-primary font-semibold w-full text-center">
          Forgot your password?
        </button>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
