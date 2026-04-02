import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Store, Home, ShoppingBag, Wrench, User, Phone, ArrowRight, ShieldCheck, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
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
  useEffect(() => () => clearRecaptcha(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await vendorLogin(email, password);
      toast.success("Welcome to Vendor Portal!");
      setTimeout(() => navigate("/vendor", { replace: true }), 500);
    } catch (err: any) { toast.error(err.message || "Invalid vendor credentials"); }
    finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleaned)) { toast.error("Please enter a valid 10-digit phone number"); return; }
    setLoading(true);
    try {
      await sendOTP(`${countryCode}${cleaned}`);
      setOtpSent(true); setTimer(30);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") toast.error("Too many requests.");
      else toast.error(err.message || "Failed to send OTP");
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
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Authentication failed");
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) throw new Error(verifyError.message);
      toast.success("Welcome to Vendor Portal! 🎉");
      setTimeout(() => navigate("/vendor", { replace: true }), 500);
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP.");
      else toast.error(err.message || "Verification failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-teal/30">
      <nav className="w-full bg-card/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="bg-white rounded-lg p-1.5 h-8 w-8 flex items-center justify-center">
              <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
            </div>
            <span className="text-white font-bold text-sm hidden sm:block">Planext4u</span>
          </Link>
          <div className="flex items-center gap-1 flex-wrap">
            <Link to="/app"><Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1"><Home className="h-3.5 w-3.5" /> Home</Button></Link>
            <Link to="/app/browse"><Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Shop</Button></Link>
            <Link to="/app/services"><Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1"><Wrench className="h-3.5 w-3.5" /> Services</Button></Link>
            <Link to="/app/login"><Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1"><User className="h-3.5 w-3.5" /> Customer</Button></Link>
            <Link to="/login"><Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">Admin</Button></Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-teal/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-amber/5 blur-3xl" />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10">
          <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="bg-gradient-to-r from-brand-dark to-brand-dark/90 p-8 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative">
                <div className="bg-white rounded-2xl p-3 w-16 h-16 mx-auto mb-3 shadow-lg">
                  <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Store className="h-5 w-5 text-brand-amber" />
                  <h1 className="text-xl font-bold text-white">Vendor Portal</h1>
                </div>
                <p className="text-white/60 text-xs">Manage your store, orders & settlements</p>
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

              <Button variant="outline" className="w-full gap-2 border-brand-amber/30 text-brand-amber hover:bg-brand-amber/10" onClick={handleSeedUsers} disabled={seeding}>
                <Database className="h-4 w-4" />
                {seeding ? "Creating demo accounts..." : "🔧 First time? Seed Demo Users"}
              </Button>

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
                      <Button onClick={handleSendOTP} className="w-full h-12 rounded-xl text-base gap-2 bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={loading || phone.length < 10}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center">Enter OTP sent to {countryCode} {phone}</p>
                      <div className="flex justify-center gap-2">
                        {[0,1,2,3,4,5].map(i => (
                          <input key={i} type="text" inputMode="numeric" maxLength={1} value={otp[i] || ""} ref={i===0?otpRef:undefined}
                            className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            onChange={(e) => { const v=e.target.value.replace(/\D/g,""); if(v){const n=otp.split("");n[i]=v;setOtp(n.join("").slice(0,6));const next=e.target.nextElementSibling as HTMLInputElement;if(next)next.focus();} }}
                            onKeyDown={(e) => { if(e.key==="Backspace"&&!otp[i]){const prev=(e.target as HTMLElement).previousElementSibling as HTMLInputElement;if(prev){prev.focus();const n=otp.split("");n[i-1]="";setOtp(n.join(""));}} }}
                            onPaste={(e) => { e.preventDefault(); setOtp(e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6)); }}
                          />
                        ))}
                      </div>
                      <Button onClick={handleVerifyOTP} className="w-full h-12 rounded-xl text-base gap-2 bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={loading || otp.length<6}>
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
                    <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={loading}>
                      {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
                    </Button>
                  </form>
                  <button onClick={quickLogin} disabled={loading} className="w-full bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-brand-teal/40 transition-all">
                    <p className="text-xs font-semibold">Quick Demo Login</p>
                    <p className="text-[10px] text-muted-foreground">vendor@planext4u.com / P4u@Vendor2026</p>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}
