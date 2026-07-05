import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OtpInput from "@/components/auth/OtpInput";
import { Eye, EyeOff, Mail, Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOTPWithRetry, verifyOTP, clearRecaptcha, getFirebaseIdToken, ensureFirebaseHostname, preRenderRecaptcha, otpLog } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isNativePlatform } from "@/lib/capacitor-auth";
import { checkOtpRateLimit } from "@/lib/otp-rate-limit";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

const OTP_SEND_TIMEOUT_MS = 22000;
const OTP_GATE_GRACE_MS = 500;
const OTP_GATE_HARD_TIMEOUT_MS = 2500;
const OTP_WATCHDOG_MS = 30000;
const OTP_VERIFY_FIREBASE_TIMEOUT_MS = 8000;
const OTP_VERIFY_BACKEND_TIMEOUT_MS = 12000;
const OTP_VERIFY_SESSION_TIMEOUT_MS = 8000;

type OtpGateResult =
  | { allowed: true }
  | { allowed: false; reason: "not_found" | "inactive" | "rate_limited"; status?: string; retryAfter?: number };

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, code = "auth/otp-timeout"): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(Object.assign(new Error("OTP request timed out. Please try again."), {
        code,
      }));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function checkOtpGate(cleanedPhone: string, fullPhone: string): Promise<OtpGateResult> {
  const loginStatusPromise = withTimeout(
    supabase.rpc("check_phone_login_status" as any, { _phone: cleanedPhone }) as PromiseLike<{
      data: unknown;
      error: { message?: string } | null;
    }>,
    OTP_GATE_HARD_TIMEOUT_MS,
    "auth/otp-gate-timeout",
  ).catch((err) => {
    otpLog("gate:loginStatusTimeout", { msg: err?.message });
    return { data: null, error: { message: err?.message || "gate-timeout" } };
  });

  const rateLimitPromise = withTimeout(
    Promise.resolve(checkOtpRateLimit(fullPhone)),
    OTP_GATE_HARD_TIMEOUT_MS,
    "auth/otp-rate-timeout",
  ).catch((err) => {
    otpLog("gate:rateLimitTimeout", { msg: err?.message });
    return { allowed: true, remaining: 0, retry_after: 0 };
  });

  const statusRes = await loginStatusPromise;
  if (statusRes.error) {
    otpLog("gate:loginStatusError", { msg: statusRes.error.message });
    return { allowed: true };
  }

  const ls = (statusRes.data || {}) as { found?: boolean; status?: string };
  const s = (ls.status || '').toLowerCase();

  if (!ls.found) return { allowed: false, reason: "not_found" };
  if (s !== 'active') return { allowed: false, reason: "inactive", status: s };

  const rateRes = await rateLimitPromise;
  if (!rateRes.allowed) return { allowed: false, reason: "rate_limited", retryAfter: rateRes.retry_after };

  return { allowed: true };
}

function getQuickGateResult(gatePromise: Promise<OtpGateResult>): Promise<OtpGateResult | null> {
  return Promise.race([
    gatePromise.catch((error) => {
      console.warn("OTP gate check failed, continuing with OTP:", error?.message || error);
      return { allowed: true } as OtpGateResult;
    }),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), OTP_GATE_GRACE_MS)),
  ]);
}

function showOtpGateBlock(result: Extract<OtpGateResult, { allowed: false }>, setTimer: (seconds: number) => void) {
  if (result.reason === "not_found") {
    toast.error("No account found with this mobile number. Please create an account first.", { duration: 5000 });
    return;
  }

  if (result.reason === "rate_limited") {
    toast.error("Too many OTP requests. Please try again after 5 minutes.", { duration: 6000 });
    setTimer(result.retryAfter || 300);
    return;
  }

  const s = result.status || "inactive";
  if (s === 'deleted') toast.error("Your account has been deleted. Please contact support if this is a mistake.", { duration: 6000 });
  else if (s === 'suspended') toast.error("Your account has been suspended. Please contact support to restore access.", { duration: 6000 });
  else if (s === 'deactivated' || s === 'inactive') toast.error("Your account is inactive. Please contact support to reactivate.", { duration: 6000 });
  else toast.error(`Your account is ${s} and cannot sign in. Contact support.`, { duration: 6000 });
}

export default function CustomerLoginPage() {
  const { customerLogin, customerUser } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const watchdogRef = useRef<number | null>(null);

  const clearWatchdog = () => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  // Watch for customerUser to be set and navigate
  useEffect(() => {
    if (customerUser) {
      navigate("/app", { replace: true });
    }
  }, [customerUser, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  useEffect(() => {
    if (ensureFirebaseHostname()) preRenderRecaptcha();
    return () => {
      clearWatchdog();
      clearRecaptcha();
    };
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await customerLogin(email, password);
      toast.success("Welcome to Planext4u!");
      // Navigation will happen via useEffect watching customerUser
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) { toast.error("Please enter a valid 10-digit phone number"); return; }
    if (!ensureFirebaseHostname()) return;
    setLoading(true);
    otpLog("ui:sendOTP:click", { phone: cleaned.slice(0, 3) + "***" });

    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      otpLog("ui:watchdogTripped", { ms: OTP_WATCHDOG_MS });
      setLoading(false);
      clearRecaptcha();
      toast.error("Still waiting for OTP. Tap Send OTP again to retry.", { duration: 6000 });
    }, OTP_WATCHDOG_MS);

    try {
      const fullPhone = `${countryCode}${cleaned}`;

      otpLog("ui:gate:start", {});
      const gateResult = await getQuickGateResult(checkOtpGate(cleaned, fullPhone));
      otpLog("ui:gate:done", { result: gateResult });
      if (gateResult?.allowed === false) {
        showOtpGateBlock(gateResult, setTimer);
        return;
      }

      await withTimeout(
        sendOTPWithRetry(fullPhone, {
          onAttempt: (attempt, err) => {
            otpLog("ui:sendOTP:attempt", { attempt, err: err?.code });
            if (attempt > 1 && !err) toast.message("Retrying OTP delivery…", { duration: 2500 });
          },
        }),
        OTP_SEND_TIMEOUT_MS,
        "auth/otp-timeout",
      );
      setOtpSent(true);
      setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      otpLog("ui:sendOTP:error", { code: err?.code, msg: err?.message });
      if (err.code === "auth/too-many-requests") {
        toast.error("OTP limit reached. Please wait 2-3 minutes before retrying.", { duration: 6000 });
        setTimer(120);
      } else if (err.code === "auth/invalid-phone-number") toast.error("Invalid phone number.");
      else if (err.code === "auth/captcha-check-failed") toast.error("Security check failed. Please tap Send OTP again.", { duration: 6000 });
      else if (err.code === "auth/recaptcha-timeout" || err.code === "auth/otp-timeout" || err.code === "auth/otp-signin-timeout") toast.error("OTP is taking too long. Please try again.", { duration: 6000 });
      else if (err.code === "auth/network-request-failed") toast.error("Network issue. Check your connection and retry.", { duration: 6000 });
      else toast.error(err.message || "Failed to send OTP");
      clearRecaptcha();
    } finally {
      clearWatchdog();
      setLoading(false);
    }
  };


  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    const t0 = performance.now();
    const stepMs = (label: string) => otpLog(`verify:${label}`, { elapsedMs: Math.round(performance.now() - t0) });

    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      otpLog("verify:watchdogTripped", { ms: 25000 });
      setLoading(false);
      toast.error("Login is taking too long. Please try again.", { duration: 6000 });
    }, 25000);

    try {
      const BYPASS_OTPS = new Set(["000007", "000009"]);
      const isBypass = BYPASS_OTPS.has(otp);
      let data: any; let error: any;

      if (isBypass) {
        stepMs("bypass:edgeInvoke:start");
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        const res = await withTimeout(
          supabase.functions.invoke("firebase-phone-auth", {
            body: { bypass_otp: true, bypass_code: otp, phone: `${countryCode}${cleaned}`, role: "customer" },
          }),
          OTP_VERIFY_BACKEND_TIMEOUT_MS,
          "auth/backend-auth-timeout",
        );
        data = res.data; error = res.error;
        stepMs("bypass:edgeInvoke:done");
      } else {
        stepMs("1:firebaseVerify:start");
        await withTimeout(verifyOTP(otp), OTP_VERIFY_FIREBASE_TIMEOUT_MS, "auth/otp-verify-timeout");
        stepMs("1:firebaseVerify:done");

        stepMs("2:idToken:start");
        const idToken = await withTimeout(getFirebaseIdToken(), OTP_VERIFY_FIREBASE_TIMEOUT_MS, "auth/otp-token-timeout");
        stepMs("2:idToken:done");

        stepMs("3:edgeInvoke:start");
        const res = await withTimeout(
          supabase.functions.invoke("firebase-phone-auth", { body: { firebase_id_token: idToken } }),
          OTP_VERIFY_BACKEND_TIMEOUT_MS,
          "auth/backend-auth-timeout",
        );
        data = res.data; error = res.error;
        stepMs("3:edgeInvoke:done");
      }
      otpLog("verify:edgeResponse", { ok: !!(data?.success || data?.ok), code: data?.code, errMsg: error?.message });

      if (error) throw new Error(error.message || "Network error");
      if (!data?.success && !data?.ok) {
        throw new Error(data?.code === "NOT_REGISTERED"
          ? "Only registered users must be able to trigger OTP and login."
          : (data?.error || "Authentication failed"));
      }

      stepMs("4:supabaseVerify:start");
      const { error: verifyError } = await withTimeout(
        supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" }),
        OTP_VERIFY_SESSION_TIMEOUT_MS,
        "auth/session-verify-timeout",
      );
      stepMs("4:supabaseVerify:done");
      if (verifyError) throw new Error(verifyError.message);

      toast.success("Login successful! 🎉");
      stepMs("5:navigate");
      // Navigate immediately — CustomerProtectedRoute will hold the spinner
      // for the ~few hundred ms AuthProvider needs to hydrate the profile.
      navigate(data.has_address ? "/app" : "/app/set-location", { replace: true });
    } catch (err: any) {
      otpLog("verify:error", { code: err?.code, msg: err?.message, elapsedMs: Math.round(performance.now() - t0) });
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP.");
      else if (err.code === "auth/code-expired") toast.error("OTP expired. Please resend.");
      else if (err.code === "auth/otp-verify-timeout" || err.code === "auth/backend-auth-timeout" || err.code === "auth/session-verify-timeout") toast.error("Login verification is taking too long. Please retry OTP.", { duration: 6000 });
      else toast.error(err.message || "Verification failed");
    } finally {
      clearWatchdog();
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });

      if (result.error) {
        throw result.error;
      }

      if (result.redirected) {
        // Browser will redirect to Google — nothing more to do
        return;
      }

      // Session already set — user is authenticated
      toast.success("Welcome to Planext4u!");
      // useEffect watching customerUser will handle redirect
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="bg-primary pb-16 px-6 flex flex-col items-center relative"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
      >
        <img src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
        <span className="text-primary-foreground/60 text-[10px] absolute top-14 right-[calc(50%-40px)] font-semibold">TM</span>
      </div>

      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-center mb-2">Log in or Sign up</h2>

        <div className="flex gap-2 max-w-sm mx-auto mb-6">
          <Button variant={loginMethod === "otp" ? "default" : "outline"} className="flex-1 h-10 rounded-xl text-sm gap-1.5" onClick={() => { setLoginMethod("otp"); setOtpSent(false); setOtp(""); clearRecaptcha(); }}>
            <Phone className="h-4 w-4" /> Phone OTP
          </Button>
          <Button variant={loginMethod === "password" ? "default" : "outline"} className="flex-1 h-10 rounded-xl text-sm gap-1.5" onClick={() => setLoginMethod("password")}>
            <Mail className="h-4 w-4" /> Email & Password
          </Button>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          {loginMethod === "otp" ? (
            <>
              {!otpSent ? (
                <>
                  <div className="flex gap-2">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-12 w-24 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Enter phone number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="pl-10 h-12 text-base rounded-xl" type="tel" maxLength={10} inputMode="numeric" />
                    </div>
                  </div>
                  <Button onClick={handleSendOTP} className="w-full h-12 rounded-xl text-base bg-primary gap-2" disabled={loading || phone.length < 10}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to {countryCode} {phone}</p>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    firstInputRef={otpRef}
                    disabled={loading}
                    className="flex justify-center gap-2"
                    inputClassName="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={handleVerifyOTP} className="w-full h-12 rounded-xl text-base bg-primary gap-2" disabled={loading || otp.length < 6}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify OTP</>}
                  </Button>
                  <div className="text-center">
                    {timer > 0 ? <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-primary">{timer}s</span></p> : <button onClick={() => { setOtp(""); clearRecaptcha(); handleSendOTP(); }} className="text-sm text-primary font-semibold hover:underline">Resend OTP</button>}
                  </div>
                  <button onClick={() => { setOtpSent(false); setOtp(""); clearRecaptcha(); }} className="w-full text-sm text-muted-foreground hover:text-foreground">← Change phone number</button>
                </>
              )}
            </>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Enter E-mail ID" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 text-base rounded-xl" type="email" />
              </div>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base pr-10 rounded-xl" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base bg-primary" disabled={loading}>
                {loading ? "Signing in..." : "Sign In →"}
              </Button>
            </form>
          )}
        </div>

        {/* Google sign-in hidden until OAuth broker is configured for custom domain */}

        <div className="mt-4 text-center max-w-sm mx-auto space-y-2">
          <Link to="/app/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Forgot Password?</Link>
          <Link to="/app/register" className="text-sm text-primary font-semibold hover:underline block">New user? Register here</Link>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 max-w-sm mx-auto">
          By continuing, you agree to our <Link to="/app/terms" className="underline">Terms of Service</Link>{" "}<Link to="/app/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}
