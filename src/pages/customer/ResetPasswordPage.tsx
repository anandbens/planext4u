import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // The user arrives here after clicking the reset link in email.
    // Supabase auto-sets the session from the URL hash/params.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        // Wait for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            setSessionReady(true);
          }
        });
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/app/login", { replace: true }), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="bg-primary pb-16 px-6 flex flex-col items-center relative"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <img src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
      </div>

      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        {success ? (
          <div className="max-w-sm mx-auto text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Password Updated!</h2>
            <p className="text-muted-foreground text-sm">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="max-w-sm mx-auto text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
          </div>
        ) : (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">Set New Password</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Enter your new password below.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 text-base rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating...</>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
            <div className="text-center">
              <Link to="/app/login" className="text-sm text-primary font-semibold hover:underline">
                ← Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
