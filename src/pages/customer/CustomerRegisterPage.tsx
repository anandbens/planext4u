import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Gift, User, Mail, Phone, ArrowLeft, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", state: "", district: "", area: "", referral_code: "", occupation: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [occupations, setOccupations] = useState<{ id: string; name: string }[]>([]);
  const [states, setStates] = useState<{ id: string; name: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);

  // OTP verification state
  const [otpStep, setOtpStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getActiveOccupations().then(setOccupations);
    api.getStates().then(setStates);
  }, []);

  useEffect(() => {
    if (form.state) {
      const st = states.find(s => s.name === form.state);
      if (st) api.getDistricts(st.id).then(setDistricts);
      else setDistricts([]);
    } else setDistricts([]);
  }, [form.state, states]);

  useEffect(() => {
    if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); }
  }, [timer]);

  useEffect(() => () => clearRecaptcha(), []);

  const captureLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); toast.success("Location captured!"); },
      () => { setGeoLoading(false); toast.error("Location access denied"); },
      { enableHighAccuracy: true }
    );
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) { toast.error("Name is required"); return false; }
    if (!form.mobile || !/^\d{10}$/.test(form.mobile)) { toast.error("Enter a valid 10-digit mobile number"); return false; }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Enter a valid email address"); return false; }
    if (!form.state) { toast.error("Please select a state"); return false; }
    if (!form.district) { toast.error("Please select a district"); return false; }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    setOtpLoading(true);
    try {
      await sendOTP(`+91${form.mobile}`);
      setOtpStep("otp");
      setTimer(30);
      toast.success("OTP sent to +91 " + form.mobile);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") toast.error("Too many requests. Try later.");
      else toast.error(err.message || "Failed to send OTP");
      clearRecaptcha();
    } finally { setOtpLoading(false); }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP(otp);
      // OTP verified, now register
      await api.registerCustomer({ ...form, city: form.district });
      toast.success("🎉 Registration successful!", { duration: 5000 });
      setTimeout(() => toast.info("📧 Welcome email sent to " + form.email, { description: "Check your inbox for activation link.", duration: 6000 }), 1000);
      setTimeout(() => toast.info("📱 Welcome SMS sent to " + form.mobile, { description: "You've earned 200 welcome points!", duration: 5000 }), 2500);
      logActivity('registration', `New customer registered: ${form.name} (${form.email})`);
      navigate("/app/login");
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP.");
      else if (err.code === "auth/code-expired") toast.error("OTP expired.");
      else toast.error(err.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary pt-8 pb-12 px-6 flex flex-col items-center relative">
        <Link to="/app/login" className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-lg font-bold">Create Account</h2>
        <p className="text-primary-foreground/60 text-xs">Join Planext4u and start shopping</p>
      </div>
      <div className="max-w-md mx-auto -mt-6 px-4 pb-8">
        <Card className="p-6">
          {otpStep === "form" ? (
            <div className="space-y-4">
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pl-10 h-11" /></div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="10-digit Mobile Number *" value={form.mobile} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0,10); setForm({...form, mobile: v}); }} className="pl-10 h-11" type="tel" maxLength={10} inputMode="numeric" />
                {form.mobile && form.mobile.length !== 10 && <p className="text-xs text-destructive mt-1">Must be 10 digits</p>}
              </div>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Email Address *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="pl-10 h-11" type="email" /></div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">State *</Label>
                <Select value={form.state} onValueChange={v => setForm({...form, state: v, district: ""})}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">District *</Label>
                <Select value={form.district} onValueChange={v => setForm({...form, district: v})} disabled={!form.state}>
                  <SelectTrigger className="h-11"><SelectValue placeholder={form.state ? "Select District" : "Select state first"} /></SelectTrigger>
                  <SelectContent>
                    {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Input placeholder="Area / Locality" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="h-11" />

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Occupation</Label>
                <Select value={form.occupation} onValueChange={v => setForm({...form, occupation: v})}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select Occupation" /></SelectTrigger>
                  <SelectContent>
                    {occupations.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" variant="outline" className="w-full h-11 gap-2" onClick={captureLocation} disabled={geoLoading}>
                <MapPin className="h-4 w-4" /> {geoLoading ? "Capturing..." : location ? "📍 Location Captured" : "Capture Location"}
              </Button>

              <div className="relative"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Referral Code (optional)" value={form.referral_code} onChange={e => setForm({...form, referral_code: e.target.value.toUpperCase()})} className="pl-10 h-11" /></div>

              <Button type="button" className="w-full h-12 text-base bg-primary gap-2" onClick={handleSendOTP} disabled={otpLoading}>
                {otpLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : <>Verify & Register <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <p className="text-xs text-muted-foreground text-center">Already have an account? <Link to="/app/login" className="text-primary font-semibold hover:underline">Sign In</Link></p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-center">Verify Your Phone</h3>
              <p className="text-sm text-muted-foreground text-center">Enter the 6-digit OTP sent to +91 {form.mobile}</p>

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

              <Button onClick={handleVerifyAndRegister} className="w-full h-12 text-base bg-primary gap-2" disabled={loading || otp.length < 6}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify & Create Account</>}
              </Button>

              <div className="text-center">
                {timer > 0 ? <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-primary">{timer}s</span></p> : <button onClick={() => { setOtp(""); clearRecaptcha(); handleSendOTP(); }} className="text-sm text-primary font-semibold hover:underline">Resend OTP</button>}
              </div>
              <button onClick={() => { setOtpStep("form"); setOtp(""); clearRecaptcha(); }} className="w-full text-sm text-muted-foreground hover:text-foreground">← Back to form</button>
            </div>
          )}
        </Card>
        <p className="text-[10px] text-muted-foreground text-center mt-4">By registering, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}
