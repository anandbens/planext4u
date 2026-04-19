import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");

  // Determine portal from URL
  const isVendor = location.pathname.startsWith("/vendor");
  const portalLabel = isVendor ? "Vendor" : "Customer";

  useEffect(() => {
    // Get real user info from customers/vendors table, not the synthetic auth email
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate(isVendor ? "/vendor/login" : "/app/login", { replace: true });
        return;
      }
      const uid = session.user.id;
      // Look up the role to find customer_id or vendor_id
      const { data: roles } = await supabase.from("user_roles").select("role, customer_id, vendor_id").eq("user_id", uid);
      const role = roles?.[0];
      if (role && !isVendor && role.customer_id) {
        const { data: cust } = await supabase.from("customers").select("email, mobile").eq("id", role.customer_id).single();
        if (cust) {
          setUserEmail(cust.email || "");
          setUserPhone(cust.mobile || "");
          return;
        }
      }
      if (role && isVendor && role.vendor_id) {
        const [{ data: vend }, { data: serviceVend }] = await Promise.all([
          supabase.from("vendors").select("email, mobile").eq("id", role.vendor_id).maybeSingle(),
          supabase.from("service_vendors" as any).select("email, mobile").eq("id", role.vendor_id).maybeSingle(),
        ]);
        const vendorRecord = vend || serviceVend;
        if (vendorRecord) {
          setUserEmail((vendorRecord as any).email || "");
          setUserPhone((vendorRecord as any).mobile || "");
          return;
        }
      }
      // Fallback to auth user data
      setUserEmail(session.user.email || "");
      setUserPhone(session.user.phone || session.user.user_metadata?.phone || "");
    });
  }, [navigate, isVendor]);

  const handleSetPassword = async () => {
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
      // Mark password_set = true in user_roles FIRST (before updateUser triggers auth events)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("user_roles")
          .update({ password_set: true } as any)
          .eq("user_id", session.user.id);
      }

      // Update local storage BEFORE updateUser to prevent race with auth events
      const storageKey = isVendor ? "vendor_user" : "customer_user";
      try {
        const d = JSON.parse(localStorage.getItem(storageKey) || "{}");
        d.password_set = true;
        d.just_logged_in = false;
        localStorage.setItem(storageKey, JSON.stringify(d));
      } catch {}

      // Now update password in Supabase Auth (this triggers SIGNED_IN event)
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);

      toast.success("Password set successfully! 🎉");
      
      // Full page reload to pick up updated state
      setTimeout(() => {
        window.location.replace(isVendor ? "/vendor" : "/app");
      }, 300);
    } catch (err: any) {
      toast.error(err.message || "Failed to set password");
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
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Set Your Password</h2>
            <p className="text-sm text-muted-foreground">
              Welcome! Set a password for your {portalLabel.toLowerCase()} account so you can also log in with email &amp; password.
            </p>
          </div>

          {/* User Info */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2">
            {userEmail && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium w-16">Email:</span>
                <span className="text-sm font-semibold text-foreground break-all">{userEmail}</span>
              </div>
            )}
            {userPhone && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium w-16">Phone:</span>
                <span className="text-sm font-semibold text-foreground">{userPhone}</span>
              </div>
            )}
          </div>

          {/* Password Fields */}
          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              onClick={handleSetPassword}
              className="w-full h-12 rounded-xl text-base gap-2"
              disabled={loading || password.length < 6}
            >
              {loading ? "Setting password..." : "Set Password & Continue"}
            </Button>

            <button
              onClick={() => {
                // Clear just_logged_in flag so user isn't redirected back
                const ck = isVendor ? "vendor_user" : "customer_user";
                try {
                  const d = JSON.parse(localStorage.getItem(ck) || "{}");
                  d.just_logged_in = false;
                  localStorage.setItem(ck, JSON.stringify(d));
                } catch {}
                window.location.replace(isVendor ? "/vendor" : "/app");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
