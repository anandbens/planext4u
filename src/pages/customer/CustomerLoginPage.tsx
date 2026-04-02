import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Database, Phone, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function CustomerLoginPage() {
  const { customerLogin } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  // Password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP login state
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  useEffect(() => () => clearRecaptcha(), []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await customerLogin(email, password);
      toast.success("Welcome to Planext4u!");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) { toast.error("Please enter a valid 10-digit phone number"); return; }
    setLoading(true);
    try {
      await sendOTP(`${countryCode}${cleaned}`);
      setOtpSent(true);
      setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") toast.error("Too many requests. Try again later.");
      else if (err.code === "auth/invalid-phone-number") toast.error("Invalid phone number.");
      else toast.error(err.message || "Failed to send OTP");
      clearRecaptcha();
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP(otp);
      const idToken = await getFirebaseIdToken();
      const { data, error } = await supabase.functions.invoke("firebase-phone-auth", { body: { firebase_id_token: idToken } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Authentication failed");
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) throw new Error(verifyError.message);
      toast.success("Login successful! 🎉");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP.");
      else if (err.code === "auth/code-expired") toast.error("OTP expired. Please resend.");
      else toast.error(err.message || "Verification failed");
    } finally { setLoading(false); }
  };

  const quickLogin = async () => {
    setLoading(true);
    try {
      await customerLogin("customer@planext4u.com", "P4u@Customer2026");
      toast.success("Welcome to Planext4u!");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) { toast.error(err.message || "Login failed."); }
    finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error instanceof Error ? result.error.message : "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome to Planext4u!");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-primary pt-12 pb-16 px-6 flex flex-col items-center relative">
        {/* Login required - no skip */}
        <img src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
        <span className="text-primary-foreground/60 text-[10px] absolute top-14 right-[calc(50%-40px)] font-semibold">TM</span>
      </div>

      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-center mb-2">Log in or Sign up</h2>

        {/* Toggle between OTP and Password */}
        <div className="flex gap-2 max-w-sm mx-auto mb-6">
          <Button variant={loginMethod === "otp" ? "default" : "outline"} className="flex-1 h-10 rounded-xl text-sm gap-1.5" onClick={() => { setLoginMethod("otp"); setOtpSent(false); setOtp(""); clearRecaptcha(); }}>
            <Phone className="h-4 w-4" /> Phone OTP
          </Button>
          <Button variant={loginMethod === "password" ? "default" : "outline"} className="flex-1 h-10 rounded-xl text-sm gap-1.5" onClick={() => setLoginMethod("password")}>
            <Mail className="h-4 w-4" /> Email & Password
          </Button>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={handleSeedUsers} disabled={seeding}>
            <Database className="h-4 w-4" />
            {seeding ? "Creating demo accounts..." : "🔧 First time? Seed Demo Users"}
          </Button>

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
                  <div className="flex justify-center gap-2">
                    {[0,1,2,3,4,5].map(i => (
                      <input key={i} type="text" inputMode="numeric" maxLength={1} value={otp[i] || ""} ref={i === 0 ? otpRef : undefined}
                        className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val) { const n = otp.split(""); n[i] = val; setOtp(n.join("").slice(0,6)); const next = e.target.nextElementSibling as HTMLInputElement; if (next) next.focus(); } }}
                        onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i]) { const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement; if (prev) { prev.focus(); const n = otp.split(""); n[i-1] = ""; setOtp(n.join("")); } } }}
                        onPaste={(e) => { e.preventDefault(); setOtp(e.clipboardData.getData("text").replace(/\D/g, "").slice(0,6)); }}
                      />
                    ))}
                  </div>
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
            <>
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
              <button onClick={quickLogin} disabled={loading} className="w-full bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-primary/40 transition-all">
                <p className="text-xs font-semibold">Quick Demo Login</p>
                <p className="text-[10px] text-muted-foreground">customer@planext4u.com / P4u@Customer2026</p>
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground mb-3">Or login with</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="h-12 px-6 rounded-full border border-border flex items-center justify-center gap-2 hover:bg-secondary transition-colors text-sm font-medium"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
          </div>
        </div>

        <div className="mt-4 text-center max-w-sm mx-auto">
          <Link to="/app/register" className="text-sm text-primary font-semibold hover:underline">New user? Register here</Link>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 max-w-sm mx-auto">
          By continuing, you agree to our <span className="underline">Terms of service</span>{" "}<span className="underline">Privacy Policy</span>{" "}<span className="underline">Content Policies</span>
        </p>
      </div>
    </div>
  );
}
