import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Handles OAuth redirect callback.
 * After Google OAuth completes, the user lands here.
 * We call the google-oauth-link edge function to verify & link the user,
 * then wait for the auth provider to load the customer.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "linked" | "failed">("checking");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      // Wait a moment for Supabase to establish session from URL hash
      await new Promise((r) => setTimeout(r, 1500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Retry once more after another delay
        await new Promise((r) => setTimeout(r, 2000));
        const { data: { session: retry } } = await supabase.auth.getSession();
        if (!retry?.user) {
          if (!cancelled) {
            toast.error("Authentication failed. Please try again.");
            navigate("/app/login", { replace: true });
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
          toast.error("Authentication failed. Please try again.");
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

        // Successfully linked — now we need the auth provider to reload
        // Force a session refresh so onAuthStateChange re-fires and loadUserRole picks up the new user_roles entry
        if (!cancelled) {
          setStatus("linked");
          // Trigger a session refresh
          await supabase.auth.refreshSession();
        }
      } catch (err: any) {
        console.error("Callback error:", err);
        await supabase.auth.signOut();
        toast.error("Authentication failed. Please try again.");
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
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
}
