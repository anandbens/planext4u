import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken, ensureFirebaseHostname, preRenderRecaptcha } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { checkOtpRateLimit } from "@/lib/otp-rate-limit";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

const OTP_SEND_TIMEOUT_MS = 18000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(Object.assign(new Error("OTP request timed out. Please try again."), {
        code: "auth/otp-timeout",
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

export default function CustomerPhoneLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

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
    return () => clearRecaptcha();
  }, []);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!ensureFirebaseHostname()) return;
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${cleaned}`;

      const [statusRes, rateRes] = await Promise.all([
        supabase.rpc('check_phone_login_status' as any, { _phone: cleaned }),
        checkOtpRateLimit(fullPhone),
      ]);

      const ls = (statusRes.data || {}) as { found?: boolean; status?: string };
      const s = (ls.status || '').toLowerCase();

      if (!ls.found) {
        toast.error("No account found with this mobile number. Please create an account first.", { duration: 5000 });
        return;
      }
      if (s !== 'active') {
        if (s === 'deleted') {
          toast.error("Your account has been deleted. Please contact support if this is a mistake.", { duration: 6000 });
        } else if (s === 'suspended') {
          toast.error("Your account has been suspended. Please contact support to restore access.", { duration: 6000 });
        } else if (s === 'deactivated' || s === 'inactive') {
          toast.error("Your account is inactive. Please contact support to reactivate.", { duration: 6000 });
        } else {
          toast.error(`Your account is ${s} and cannot sign in. Contact support.`, { duration: 6000 });
        }
        return;
      }

      if (!rateRes.allowed) {
        toast.error("Too many OTP requests. Please try again after 5 minutes.", { duration: 6000 });
        setTimer(rateRes.retry_after);
        return;
      }

      await withTimeout(sendOTP(fullPhone), OTP_SEND_TIMEOUT_MS);

      setOtpSent(true);
      setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      console.error("OTP send error:", err);
      if (err.code === "auth/too-many-requests") {
        toast.error("OTP limit reached. Please wait 2-3 minutes before retrying.", { duration: 6000 });
        setTimer(120);
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number. Check and try again.");
      } else if (err.code === "auth/captcha-check-failed") {
        toast.error("Security check failed. Please refresh and try again.");
      } else if (err.code === "auth/recaptcha-timeout" || err.code === "auth/otp-timeout") {
        toast.error("OTP is taking too long. Please try again.", { duration: 6000 });
      } else {
        toast.error(err.message || "Failed to send OTP. Please try again.");
      }
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Verify OTP with Firebase
      console.log("[PhoneLogin] Step 1: Verifying OTP with Firebase...");
      await verifyOTP(otp);
      console.log("[PhoneLogin] Step 1 done: Firebase OTP verified");

      // Step 2: Get Firebase ID token
      console.log("[PhoneLogin] Step 2: Getting Firebase ID token...");
      const idToken = await getFirebaseIdToken();
      console.log("[PhoneLogin] Step 2 done: Got Firebase ID token");

      // Step 3: Call edge function to create/verify Supabase session
      console.log("[PhoneLogin] Step 3: Invoking firebase-phone-auth edge function...");
      const { data, error } = await supabase.functions.invoke("firebase-phone-auth", {
        body: { firebase_id_token: idToken },
      });

      console.log("[PhoneLogin] Step 3 response:", JSON.stringify({ data: data ? { success: data.success, code: data.code, error: data.error } : null, error: error?.message }));

      if (error) {
        // supabase.functions.invoke error (network, CORS, etc.)
        console.error("[PhoneLogin] Edge function invoke error:", error);
        throw new Error(error.message || "Network error. Please check your connection and try again.");
      }

      if (!data?.success) {
        const errMsg = data?.code === "NOT_REGISTERED"
          ? "No account found with this mobile number. Please create an account first."
          : data?.code === "EMAIL_ALREADY_EXISTS"
          ? "This email is already registered with another account. Please use a different email."
          : (data?.error || "Something went wrong. Please try again.");
        throw new Error(errMsg);
      }

      // Step 4: Establish Supabase session using the magic link token
      console.log("[PhoneLogin] Step 4: Verifying Supabase OTP with token_hash...");
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("[PhoneLogin] Step 4 verifyOtp error:", verifyError);
        throw new Error("Session verification failed. Please try logging in again.");
      }

      console.log("[PhoneLogin] Login successful!");
      toast.success("Login successful! 🎉");

      // Tight 75 ms poll (was 250 ms) — the AuthProvider usually finishes
      // hydration within a few hundred ms, so a coarse interval added dead
      // wait to every successful login.
      const waitForCustomer = () => new Promise<void>((resolve) => {
        let attempts = 0;
        const MAX_ATTEMPTS = 80; // 80 × 75ms ≈ 6s upper bound
        const check = async () => {
          const saved = localStorage.getItem("customer_user");
          if (saved) {
            resolve();
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user || attempts >= MAX_ATTEMPTS) {
            resolve();
            return;
          }

          attempts += 1;
          setTimeout(() => {
            void check();
          }, 75);
        };

        void check();
      });

      await waitForCustomer();
      navigate("/app", { replace: true });
    } catch (err: any) {
      console.error("[PhoneLogin] OTP verify error:", err, "code:", err.code, "message:", err.message);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (err.code === "auth/code-expired") {
        toast.error("OTP expired. Please resend.");
      } else {
        toast.error(err.message || "Verification failed. Please try again.");
      }
    } finally {
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
