import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

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
    return () => clearRecaptcha();
  }, []);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      await sendOTP(`${countryCode}${cleaned}`);
      setOtpSent(true);
      setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      console.error("OTP send error:", err);
      if (err.code === "auth/too-many-requests") {
        toast.error("Too many requests. Please try again later.");
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number. Check and try again.");
      } else {
        toast.error(err.message || "Failed to send OTP");
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
      await verifyOTP(otp);

      // Step 2: Get Firebase ID token
      const idToken = await getFirebaseIdToken();

      // Step 3: Call edge function to create/verify Supabase session
      const { data, error } = await supabase.functions.invoke("firebase-phone-auth", {
        body: { firebase_id_token: idToken },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Backend authentication failed");
      }

      // Step 4: Establish Supabase session using the magic link token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      toast.success("Login successful! 🎉");
      // The auth state change listener in AuthProvider will handle setting customerUser
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      console.error("OTP verify error:", err);
      if (err.code === "auth/invalid-verification-code") {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (err.code === "auth/code-expired") {
        toast.error("OTP expired. Please resend.");
      } else {
        toast.error(err.message || "Verification failed");
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
      <div className="bg-primary pt-12 pb-16 px-6 flex flex-col items-center relative">
        <Link
          to="/app"
          className="absolute top-4 right-4 bg-primary-foreground/20 text-primary-foreground text-xs px-4 py-1.5 rounded-full hover:bg-primary-foreground/30 transition-colors"
        >
          skip
        </Link>
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
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] || ""}
                    ref={i === 0 ? otpRef : undefined}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val) {
                        const newOtp = otp.split("");
                        newOtp[i] = val;
                        setOtp(newOtp.join("").slice(0, 6));
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        if (next && val) next.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i]) {
                        const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                        if (prev) {
                          prev.focus();
                          const newOtp = otp.split("");
                          newOtp[i - 1] = "";
                          setOtp(newOtp.join(""));
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      setOtp(pasted);
                    }}
                  />
                ))}
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

      <div id="recaptcha-container" />
    </div>
  );
}
