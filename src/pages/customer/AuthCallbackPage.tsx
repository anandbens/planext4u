import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";
import { closeOAuthBrowser, extractOAuthResultFromUrl } from "@/lib/capacitor-auth";

type CallbackStatus = "checking" | "linked" | "failed";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("checking");
  const [message, setMessage] = useState("Completing Google sign-in...");
  const [redirectPath, setRedirectPath] = useState("/app");

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const ensureSession = async () => {
      const authResult = extractOAuthResultFromUrl(window.location.href);

      if (authResult.error) {
        throw new Error(authResult.errorDescription || "Google sign-in was cancelled.");
      }

      if (authResult.accessToken && authResult.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: authResult.accessToken,
          refresh_token: authResult.refreshToken,
        });

        if (error) {
          throw error;
        }

        window.history.replaceState({}, document.title, "/auth/callback");
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          return session;
        }

        await wait(600);
      }

      return null;
    };

    const handleCallback = async () => {
      try {
        const session = await ensureSession();

        if (!session?.user) {
          throw new Error("Sign-in could not be completed. Please try again.");
        }

        const { data, error } = await supabase.functions.invoke("google-oauth-link");

        if (error) {
          throw error;
        }

        if (!data?.success || !data?.registered) {
          await supabase.auth.signOut();
          throw new Error(
            data?.error ||
              "Your Gmail is not registered with Planext4U. Create your account first to do a Google Sign-in."
          );
        }

        if (cancelled) {
          return;
        }

        setRedirectPath(data?.has_address ? "/app" : "/app/set-location");
        setMessage(data?.has_address ? "Signing you in..." : "Taking you to location setup...");
        setStatus("linked");
        await closeOAuthBrowser();
        await supabase.auth.refreshSession();
      } catch (err: any) {
        console.error("Google auth callback failed:", err);
        await closeOAuthBrowser();
        await supabase.auth.signOut();

        if (!cancelled) {
          const errorMessage = err?.message || "Google sign-in failed. Please try again.";
          setStatus("failed");
          setMessage(errorMessage);
          toast.error(errorMessage, { duration: 6000 });
          window.setTimeout(() => navigate("/app/login", { replace: true }), 1800);
        }
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (status === "linked" && !isLoading && customerUser) {
      toast.success("Welcome to Planext4u!");
      navigate(redirectPath, { replace: true });
    }
  }, [status, isLoading, customerUser, navigate, redirectPath]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain rounded-xl" />
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">
        {status === "failed" ? "Redirecting to login..." : message}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
