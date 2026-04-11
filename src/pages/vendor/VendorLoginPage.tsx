import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OtpInput from "@/components/auth/OtpInput";
import { Eye, EyeOff, LogIn, Store, ShoppingBag, Wrench, Phone, ArrowRight, ShieldCheck, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken, ensureFirebaseHostname, preRenderRecaptcha } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { checkOtpRateLimit } from "@/lib/otp-rate-limit";
import p4uLogo from "@/assets/p4u-logo.png";

export default function VendorLoginPage() {
  const { vendorLogin } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  // Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP state
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); } }, [timer]);
  useEffect(() => { if (ensureFirebaseHostname()) preRenderRecaptcha(); return () => clearRecaptcha(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await vendorLogin(email, password);
      toast.success("Welcome to Vendor Portal!");
      setTimeout(() => navigate("/vendor", { replace: true }), 500);
    } catch (err: any) { toast.error(err.message || "Invalid email or password. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) { toast.error("Please enter a valid 10-digit phone number"); return; }
    if (!ensureFirebaseHostname()) return;
    setLoading(true);
    try {
      // Check vendor verification status before sending OTP
      const { data: vendorApp } = await supabase.from("vendor_applications").select("status, rejection_reason").eq("phone", cleaned).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: vendor } = await supabase.from("vendors").select("status, mobile").eq("mobile", cleaned).maybeSingle();
      
      if (vendorApp && !vendor) {
        if (vendorApp.status === 'rejected') {
          setLoading(false);
          toast.error(`Your vendor application was rejected. ${vendorApp.rejection_reason ? 'Reason: ' + vendorApp.rejection_reason : 'Please contact support for details.'}`, { duration: 7000 });
          return;
        }
        if (vendorApp.status !== 'approved' && vendorApp.status !== 'verified') {
          setLoading(false);
          toast.info("Your profile is submitted for approval. You will be notified once your profile is approved.", { duration: 6000 });
          return;
        }
      }
      
      if (vendor && vendor.status === 'rejected') {
        setLoading(false);
        toast.error("Your vendor profile has been rejected. Please contact support.", { duration: 6000 });
        return;
      }

      if (vendor && vendor.status !== 'active' && vendor.status !== 'verified') {
        setLoading(false);
        toast.info("Your profile is submitted for approval. You will be notified once your profile is approved.", { duration: 6000 });
        return;
      }
      
      if (!vendorApp && !vendor) {
        setLoading(false);
        toast.error("No vendor account found with this phone number. Please register first.");
        return;
      }

      // Rate limit check before Firebase OTP
      const rateCheck = await checkOtpRateLimit(`${countryCode}${cleaned}`);
      if (!rateCheck.allowed) {
        setLoading(false);
        toast.error("Too many OTP requests. Please try again after 5 minutes.", { duration: 6000 });
        setTimer(rateCheck.retry_after);
        return;
      }
      
      await sendOTP(`${countryCode}${cleaned}`);
      setOtpSent(true); setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        toast.error("OTP limit reached. Please wait 2-3 minutes before retrying.", { duration: 6000 });
        setTimer(120);
      } else toast.error("Failed to send OTP. Please try again.");
      clearRecaptcha();
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP(otp);
      const idToken = await getFirebaseIdToken();
      const { data, error } = await supabase.functions.invoke("firebase-phone-auth", { body: { firebase_id_token: idToken, role: "vendor" } });
      if (error || !data?.success) throw new Error(data?.error || "Something went wrong. Please try again.");
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) throw new Error("Session verification failed. Please try logging in again.");
      toast.success("Welcome to Vendor Portal! 🎉");
      // Wait for auth state to propagate before navigating
      const waitForVendor = () => new Promise<void>((resolve) => {
        let attempts = 0;
        const check = () => {
          const saved = localStorage.getItem("vendor_user");
          if (saved || attempts >= 20) { resolve(); return; }
          attempts++;
          setTimeout(check, 250);
        };
        check();
      });
      await waitForVendor();
      navigate("/vendor", { replace: true });
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP. Please check and try again.");
      else toast.error(err.message || "Verification failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-200/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10">
            <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative">
                <div className="bg-white rounded-2xl p-3 w-16 h-16 mx-auto mb-3 shadow-lg">
                  <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Store className="h-5 w-5 text-primary-foreground/80" />
                  <h1 className="text-xl font-bold text-primary-foreground">Vendor Portal</h1>
                </div>
                <p className="text-primary-foreground/60 text-xs">Manage your store, orders & settlements</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Toggle */}
              <div className="flex gap-2">
                <Button variant={loginMethod === "otp" ? "default" : "outline"} className="flex-1 h-9 rounded-xl text-xs gap-1.5" onClick={() => { setLoginMethod("otp"); setOtpSent(false); setOtp(""); clearRecaptcha(); }}>
                  <Phone className="h-3.5 w-3.5" /> Phone OTP
                </Button>
                <Button variant={loginMethod === "password" ? "default" : "outline"} className="flex-1 h-9 rounded-xl text-xs gap-1.5" onClick={() => setLoginMethod("password")}>
                  <Mail className="h-3.5 w-3.5" /> Email & Password
                </Button>
              </div>


              {loginMethod === "otp" ? (
                <>
                  {!otpSent ? (
                    <>
                      <div className="flex gap-2">
                        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-12 w-24 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+971">🇦🇪 +971</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0,10))} className="pl-10 h-12 rounded-xl" type="tel" maxLength={10} inputMode="numeric" />
                        </div>
                      </div>
                      <Button onClick={handleSendOTP} className="w-full h-12 rounded-xl text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading || phone.length < 10}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center">Enter OTP sent to {countryCode} {phone}</p>
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        firstInputRef={otpRef}
                        disabled={loading}
                        className="flex justify-center gap-2"
                        inputClassName="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button onClick={handleVerifyOTP} className="w-full h-12 rounded-xl text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading || otp.length<6}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify OTP</>}
                      </Button>
                      <div className="text-center">
                        {timer>0 ? <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-primary">{timer}s</span></p> : <button onClick={()=>{setOtp("");clearRecaptcha();handleSendOTP();}} className="text-sm text-primary font-semibold hover:underline">Resend OTP</button>}
                      </div>
                      <button onClick={()=>{setOtpSent(false);setOtp("");clearRecaptcha();}} className="w-full text-sm text-muted-foreground hover:text-foreground">← Change phone number</button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder="Vendor Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" type="email" />
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
                      {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
                    </Button>
                  </form>
                </>
              )}
            </div>
            <div className="text-center space-y-2 mt-4">
              <p className="text-sm text-muted-foreground">
                New vendor? <Link to="/vendor/register" className="text-primary hover:underline font-semibold">Register here</Link>
              </p>
              <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground">← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}
