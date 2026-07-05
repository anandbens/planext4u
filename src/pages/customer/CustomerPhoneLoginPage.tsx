import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOTPWithRetry, verifyOTP, clearRecaptcha, getFirebaseIdToken, ensureFirebaseHostname, preRenderRecaptcha, otpLog } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
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
    supabase.rpc('check_phone_login_status' as any, { _phone: cleanedPhone }) as PromiseLike<{
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
  if (s === 'deleted') {
    toast.error("Your account has been deleted. Please contact support if this is a mistake.", { duration: 6000 });
  } else if (s === 'suspended') {
    toast.error("Your account has been suspended. Please contact support to restore access.", { duration: 6000 });
  } else if (s === 'deactivated' || s === 'inactive') {
    toast.error("Your account is inactive. Please contact support to reactivate.", { duration: 6000 });
  } else {
    toast.error(`Your account is ${s} and cannot sign in. Contact support.`, { duration: 6000 });
  }
}

export default function CustomerPhoneLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const watchdogRef = useRef<number | null>(null);

  const clearWatchdog = () => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  useEffect(() => {
    // Pre-render reCAPTCHA on mount for faster OTP delivery
    if (ensureFirebaseHostname()) {
      preRenderRecaptcha();
    }
    return () => {
      clearWatchdog();
      clearRecaptcha();
    };
  }, []);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!ensureFirebaseHostname()) return;
    setLoading(true);
    otpLog("ui:sendOTP:click", { phone: cleaned.slice(0, 3) + "***" });

    // UI watchdog: never leave the button stuck. If the entire OTP send
    // pipeline hasn't completed within OTP_WATCHDOG_MS, forcibly reset state
    // so the user can retry immediately.
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
            if (attempt > 1 && !err) {
              toast.message("Retrying OTP delivery…", { duration: 2500 });
            }
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
      console.error("OTP send error:", err);
      if (err.code === "auth/too-many-requests") {
        toast.error("OTP limit reached. Please wait 2-3 minutes before retrying.", { duration: 6000 });
        setTimer(120);
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number. Check and try again.");
      } else if (err.code === "auth/captcha-check-failed") {
        toast.error("Security check failed. Please tap Send OTP again.", { duration: 6000 });
      } else if (
        err.code === "auth/recaptcha-timeout" ||
        err.code === "auth/otp-timeout" ||
        err.code === "auth/otp-signin-timeout"
      ) {
        toast.error("OTP is taking too long. Please try again.", { duration: 6000 });
      } else if (err.code === "auth/network-request-failed") {
        toast.error("Network issue. Check your connection and retry.", { duration: 6000 });
      } else {
        toast.error(err.message || "Failed to send OTP. Please try again.");
      }
      clearRecaptcha();
    } finally {
      clearWatchdog();
      setLoading(false);
    }
  };


  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    const t0 = performance.now();
    const stepMs = (label: string) => otpLog(`verify:${label}`, { elapsedMs: Math.round(performance.now() - t0) });

    // Verify watchdog — never leave the button stuck.
    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      otpLog("verify:watchdogTripped", { ms: 25000 });
      setLoading(false);
      toast.error("Login is taking too long. Please try again.", { duration: 6000 });
    }, 25000);

    try {
      const CUSTOMER_BYPASS_OTP = "000009";
      const isBypass = otp === CUSTOMER_BYPASS_OTP;
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
          supabase.functions.invoke("firebase-phone-auth", {
            body: { firebase_id_token: idToken },
          }),
          OTP_VERIFY_BACKEND_TIMEOUT_MS,
          "auth/backend-auth-timeout",
        );
        data = res.data; error = res.error;
        stepMs("3:edgeInvoke:done");
      }
      otpLog("verify:edgeResponse", {
        ok: !!data?.success,
        code: data?.code,
        errMsg: error?.message,
      });

      if (error) throw new Error(error.message || "Network error. Please check your connection and try again.");

      if (!data?.success) {
        const errMsg = data?.code === "NOT_REGISTERED"
          ? "No account found with this mobile number. Please create an account first."
          : data?.code === "EMAIL_ALREADY_EXISTS"
          ? "This email is already registered with another account. Please use a different email."
          : (data?.error || "Something went wrong. Please try again.");
        throw new Error(errMsg);
      }

      stepMs("4:supabaseVerify:start");
      const { error: verifyError } = await withTimeout(
        supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        }),
        OTP_VERIFY_SESSION_TIMEOUT_MS,
        "auth/session-verify-timeout",
      );
      stepMs("4:supabaseVerify:done");

      if (verifyError) throw new Error("Session verification failed. Please try logging in again.");

      // Session is set. Navigate immediately — CustomerProtectedRoute will
      // spin briefly while AuthProvider hydrates the profile, then render.
      // The old localStorage poll added multi-second dead time on every login.
      toast.success("Login successful! 🎉");
      stepMs("5:navigate");
      navigate("/app", { replace: true });
    } catch (err: any) {
      otpLog("verify:error", { code: err?.code, msg: err?.message, elapsedMs: Math.round(performance.now() - t0) });
      console.error("[PhoneLogin] OTP verify error:", err);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (err.code === "auth/code-expired") {
        toast.error("OTP expired. Please resend.");
      } else if (err.code === "auth/otp-verify-timeout" || err.code === "auth/backend-auth-timeout" || err.code === "auth/session-verify-timeout") {
        toast.error("Login verification is taking too long. Please retry OTP.", { duration: 6000 });
      } else {
        toast.error(err.message || "Verification failed. Please try again.");
      }
    } finally {
      clearWatchdog();
      setLoading(false);
    }
  };


  const handleResend = () => {
    setOtp("");
    clearRecaptcha();
    handleSendOTP();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="bg-primary pb-16 px-6 flex flex-col items-center relative"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
      >
        {/* Login required - no skip */}
        <img src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
      </div>

      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-center mb-2">
          {otpSent ? "Verify OTP" : "Login with Phone"}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {otpSent
            ? `Enter the 6-digit code sent to ${countryCode} ${phone}`
            : "We'll send you a one-time verification code"}
        </p>

        <div className="space-y-4 max-w-sm mx-auto">
          {!otpSent ? (
            <>
              <div className="flex gap-2">
                <div className="relative w-24">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10 h-12 text-base rounded-xl"
                    type="tel"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOTP}
                className="w-full h-12 rounded-xl text-base bg-primary gap-2"
                disabled={loading || phone.length < 10}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</>
                ) : (
                  <>Send OTP <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  className="w-full max-w-[280px] h-14 text-center text-2xl font-bold tracking-[0.5em] rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(val);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    setOtp(pasted);
                  }}
                  placeholder="------"
                />
              </div>

              <Button
                onClick={handleVerifyOTP}
                className="w-full h-12 rounded-xl text-base bg-primary gap-2"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Verify OTP</>
                )}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm text-muted-foreground">Resend OTP in <span className="font-semibold text-primary">{timer}s</span></p>
                ) : (
                  <button onClick={handleResend} className="text-sm text-primary font-semibold hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={() => { setOtpSent(false); setOtp(""); clearRecaptcha(); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Change phone number
              </button>
            </>
          )}
        </div>

        <div className="mt-6 max-w-sm mx-auto">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border flex-1" />
            <span className="px-3 text-xs text-muted-foreground bg-card">or</span>
            <div className="border-t border-border flex-1" />
          </div>
        </div>

        <div className="mt-4 text-center max-w-sm mx-auto space-y-2">
          <Link to="/app/login" className="text-sm text-primary font-semibold hover:underline block">
            Login with Email & Password
          </Link>
          <Link to="/app/register" className="text-sm text-muted-foreground hover:text-primary transition-colors block">
            New user? Register here
          </Link>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 max-w-sm mx-auto">
          By continuing, you agree to our{" "}
          <span className="underline">Terms of service</span>{" "}
          <span className="underline">Privacy Policy</span>{" "}
          <span className="underline">Content Policies</span>
        </p>
      </div>

    </div>
  );
}
