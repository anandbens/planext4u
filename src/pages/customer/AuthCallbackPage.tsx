import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

/**
 * Handles OAuth redirect callback.
 * After Google OAuth redirect, Supabase auto-establishes the session from
 * the URL hash. We then call google-oauth-link to verify registration.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "linked" | "failed" | "redirecting">("checking");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      // Give Supabase time to parse the URL hash/code and establish session
      await new Promise((r) => setTimeout(r, 2000));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Retry once
        await new Promise((r) => setTimeout(r, 2000));
        const { data: { session: retry } } = await supabase.auth.getSession();
        if (!retry?.user) {
          if (!cancelled) {
            setStatus("redirecting");
            toast.error("Sign-in could not be completed. Please try again.");
            setTimeout(() => navigate("/app/login", { replace: true }), 2000);
          }
          return;
        }
      }

      // Session exists — call the linking edge function
      try {
        const { data, error } = await supabase.functions.invoke("google-oauth-link");

        if (error) {
          console.error("google-oauth-link error:", error);
          await supabase.auth.signOut();
          toast.error("Sign-in failed. Please try again.");
          if (!cancelled) navigate("/app/login", { replace: true });
          return;
        }

        if (!data?.success || !data?.registered) {
          await supabase.auth.signOut();
          toast.error(
            data?.error || "Your Gmail is not registered with Planext4U. Create your account first to do a Google Sign-in.",
            { duration: 6000 }
          );
          if (!cancelled) navigate("/app/login", { replace: true });
          return;
        }

        // Successfully linked — refresh so auth provider picks up the role
        if (!cancelled) {
          setStatus("linked");
          await supabase.auth.refreshSession();
        }
      } catch (err: any) {
        console.error("Callback error:", err);
        await supabase.auth.signOut();
        toast.error("Sign-in failed. Please try again.");
        if (!cancelled) navigate("/app/login", { replace: true });
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  // Once auth provider finishes loading and customerUser is set, redirect
  useEffect(() => {
    if (status === "linked" && !isLoading && customerUser) {
      toast.success("Welcome to Planext4u!");
      navigate("/app", { replace: true });
    }
  }, [status, isLoading, customerUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain rounded-xl" />
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">
        {status === "redirecting" ? "Redirecting to login..." : "Signing you in..."}
      </p>
      <p className="text-xs text-muted-foreground mt-4">Planext4U</p>
    </div>
  );
}
