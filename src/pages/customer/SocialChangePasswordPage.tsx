import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function SocialChangePasswordPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      // Mark password_set
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("user_roles").update({ password_set: true } as any).eq("user_id", session.user.id);
      }
      toast.success("Password updated successfully! 🎉");
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
        {customerUser?.email && (
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Account:</span>
              <span className="text-sm font-semibold">{customerUser.email}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Set a new password for your account. Must be at least 6 characters.
        </p>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showNew ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
            className="pl-10 pr-10 h-12 rounded-xl"
          />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNew(v => !v)}>
            {showNew ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showConfirm ? "text" : "password"}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className="pl-10 pr-10 h-12 rounded-xl"
          />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)}>
            {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-base gap-2" disabled={saving || newPw.length < 6}>
          {saving ? "Updating..." : <><ShieldCheck className="h-4 w-4" /> Update Password</>}
        </Button>
      </div>
    </div>
  );

  return <SocialLayout>{content}</SocialLayout>;
}
