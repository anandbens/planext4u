import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Gift, User, Mail, Phone, ArrowLeft, Loader2, ShieldCheck, ArrowRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { sendOTP, verifyOTP, clearRecaptcha, getFirebaseIdToken, resetPhoneAuth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

function TermsContent() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <h2 className="text-lg font-bold text-primary">Terms & Conditions</h2>
      <p className="text-muted-foreground text-xs">Last updated: April 2026</p>
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using the Planext4u application ("App"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree, do not use the App.</p>
      <h3>2. Description of Service</h3>
      <p>Planext4u is a super-app platform that provides e-commerce, property listings, classifieds, social networking, and service bookings. The platform connects customers with vendors and service providers.</p>
      <h3>3. User Accounts</h3>
      <ul><li>You must provide accurate and complete information during registration.</li><li>You are responsible for maintaining the confidentiality of your account credentials.</li><li>Each mobile number may be associated with only one account.</li><li>You must be at least 18 years old to create an account.</li><li>We reserve the right to suspend or terminate accounts that violate these Terms.</li></ul>
      <h3>4. Orders & Payments</h3>
      <ul><li>All prices are listed in Indian Rupees (INR) unless otherwise stated.</li><li>Payments are processed through secure payment gateways (Razorpay).</li><li>Once an order is confirmed and payment is processed, cancellation is subject to our cancellation policy.</li><li>Planext4u is not responsible for the quality or delivery of products/services provided by third-party vendors.</li></ul>
      <h3>5. Wallet Points & Referrals</h3>
      <ul><li>Wallet points are earned through registration, referrals, and promotional activities.</li><li>Points can be redeemed during checkout subject to maximum redemption limits per product/service.</li><li>Points have no cash value and cannot be transferred or sold.</li><li>Planext4u reserves the right to modify the points program at any time.</li></ul>
      <h3>6. Property Listings</h3>
      <ul><li>Users may post property listings for sale, rent, or PG accommodation.</li><li>All listings are subject to moderation and approval.</li><li>Planext4u does not guarantee the accuracy of property listings and is not a party to any property transaction.</li><li>Users are responsible for verifying property details independently.</li></ul>
      <h3>7. Classified Ads</h3>
      <ul><li>Users may post classified ads for buying and selling goods.</li><li>Prohibited items include illegal goods, weapons, counterfeit items, and regulated substances.</li><li>Planext4u reserves the right to remove any ad without notice.</li></ul>
      <h3>8. Social Features</h3>
      <ul><li>Users must not post content that is abusive, defamatory, obscene, or violates any law.</li><li>Planext4u may moderate and remove content at its discretion.</li><li>Users retain ownership of their content but grant Planext4u a license to display it on the platform.</li></ul>
      <h3>9. Intellectual Property</h3>
      <p>All content, trademarks, logos, and design elements of the App are the property of Planext4u and its licensors. Unauthorized use is prohibited.</p>
      <h3>10. Limitation of Liability</h3>
      <p>Planext4u is provided "as is" without warranties. We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.</p>
      <h3>11. Governing Law</h3>
      <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Coimbatore, Tamil Nadu.</p>
      <h3>12. Changes to Terms</h3>
      <p>We may update these Terms at any time. Continued use of the App constitutes acceptance of the revised Terms.</p>
      <h3>13. Contact</h3>
      <p>For questions about these Terms, contact us at <strong>support@planext4u.com</strong>.</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <h2 className="text-lg font-bold text-primary mt-8 pt-6 border-t">Privacy Policy</h2>
      <p className="text-muted-foreground text-xs">Last updated: April 2026</p>
      <h3>1. Introduction</h3>
      <p>Planext4u ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use our application.</p>
      <h3>2. Information We Collect</h3>
      <h4>2.1 Information You Provide</h4>
      <ul><li><strong>Account Data:</strong> Name, email address, mobile number, occupation, state, and district.</li><li><strong>Address Data:</strong> Delivery addresses, GPS coordinates, landmarks.</li><li><strong>Transaction Data:</strong> Order details, payment information (processed securely via Razorpay).</li><li><strong>Content:</strong> Posts, comments, photos, and messages shared on social features.</li><li><strong>Property Listings:</strong> Property details, images, and contact information.</li><li><strong>KYC Data:</strong> Identity documents submitted for verification.</li></ul>
      <h4>2.2 Information Collected Automatically</h4>
      <ul><li><strong>Device Information:</strong> Device type, operating system, browser type.</li><li><strong>Location Data:</strong> GPS coordinates when you enable location services.</li><li><strong>Usage Data:</strong> Pages viewed, features used, interaction patterns.</li><li><strong>Log Data:</strong> IP address, timestamps, error logs.</li></ul>
      <h3>3. How We Use Your Information</h3>
      <ul><li>To create and manage your account.</li><li>To process orders, payments, and deliveries.</li><li>To show relevant products, services, and properties based on your location.</li><li>To enable social features (posts, messaging, follows).</li><li>To send notifications about orders, promotions, and platform updates.</li><li>To process referrals and wallet point transactions.</li><li>To improve our services through analytics.</li><li>To prevent fraud and ensure platform security.</li></ul>
      <h3>4. Data Sharing</h3>
      <ul><li><strong>Vendors:</strong> Your name, delivery address, and order details are shared with vendors to fulfil orders.</li><li><strong>Payment Processors:</strong> Payment data is shared with Razorpay for transaction processing.</li><li><strong>Property Enquiries:</strong> Your contact details may be shared with property owners when you enquire about a listing.</li><li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights.</li><li>We do <strong>not</strong> sell your personal information to third parties.</li></ul>
      <h3>5. Data Storage & Security</h3>
      <ul><li>Your data is stored on secure cloud servers.</li><li>We use encryption (TLS/SSL) for data in transit.</li><li>Access to personal data is restricted to authorized personnel only.</li><li>We retain your data for as long as your account is active or as required by law.</li></ul>
      <h3>6. Your Rights</h3>
      <ul><li><strong>Access:</strong> You can view your personal data through your profile settings.</li><li><strong>Correction:</strong> You can update your information at any time.</li><li><strong>Deletion:</strong> You can request account deletion by contacting support.</li><li><strong>Data Portability:</strong> You can request a copy of your data.</li><li><strong>Opt-out:</strong> You can opt out of promotional communications.</li></ul>
      <h3>7. Cookies & Tracking</h3>
      <p>We use local storage and session data to maintain your login state and preferences. We do not use third-party tracking cookies for advertising purposes.</p>
      <h3>8. Children's Privacy</h3>
      <p>Our services are not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
      <h3>9. Third-Party Services</h3>
      <p>Our App may contain links to third-party websites or services. We are not responsible for their privacy practices. We recommend reviewing their privacy policies.</p>
      <h3>10. Changes to This Policy</h3>
      <p>We may update this Privacy Policy periodically. We will notify you of significant changes through the App or via email.</p>
      <h3>11. Contact Us</h3>
      <p>For privacy-related queries, contact us at:</p>
      <ul><li>Email: <strong>privacy@planext4u.com</strong></li><li>Support: <strong>support@planext4u.com</strong></li></ul>
    </div>
  );
}

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", state: "", district: "", area: "", referral_code: "", occupation: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [occupations, setOccupations] = useState<{ id: string; name: string }[]>([]);
  const [states, setStates] = useState<{ id: string; name: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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
      const st = states.find((s) => s.name === form.state);
      if (st) api.getDistricts(st.id).then(setDistricts);
      else setDistricts([]);
    } else {
      setDistricts([]);
    }
  }, [form.state, states]);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  useEffect(() => {
    return () => {
      resetPhoneAuth();
    };
  }, []);

  const captureLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Location captured!");
      },
      () => {
        setGeoLoading(false);
        toast.error("Location access denied");
      },
      { enableHighAccuracy: true }
    );
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) { toast.error("Name is required"); return false; }
    if (!form.mobile || !/^\d{10}$/.test(form.mobile)) { toast.error("Enter a valid 10-digit mobile number"); return false; }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Enter a valid email address"); return false; }
    if (!form.state) { toast.error("Please select a state"); return false; }
    if (!form.district) { toast.error("Please select a district"); return false; }
    if (!acceptedTerms) { toast.error("Please accept the Terms & Conditions and Privacy Policy"); return false; }
    return true;
  };

  const checkMobileUnique = async (): Promise<boolean> => {
    const { data } = await supabase.from("customers").select("id").eq("mobile", `+91${form.mobile}`).maybeSingle();
    if (data) { toast.error("This mobile number is already registered. Please login instead."); return false; }
    const { data: data2 } = await supabase.from("customers").select("id").eq("mobile", form.mobile).maybeSingle();
    if (data2) { toast.error("This mobile number is already registered. Please login instead."); return false; }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    setOtpLoading(true);
    try {
      const isUnique = await checkMobileUnique();
      if (!isUnique) return;
      await resetPhoneAuth();
      await new Promise((r) => setTimeout(r, 400));
      await sendOTP(`+91${form.mobile}`);
      setOtpStep("otp");
      setTimer(45);
      toast.success("OTP sent to +91 " + form.mobile);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        toast.error("OTP is temporarily rate limited by Firebase for this number/device. Please wait a few minutes or try a different test number.", { duration: 7000 });
        setTimer(180);
      } else if (err.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number.");
      } else if (err.message?.includes("reCAPTCHA")) {
        toast.error("Phone verification could not start. Please try again.");
      } else {
        toast.error(err.message || "Failed to send OTP");
      }
      await resetPhoneAuth();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP(otp);
      const idToken = await getFirebaseIdToken();
      const { data, error } = await supabase.functions.invoke("firebase-phone-auth", {
        body: { firebase_id_token: idToken },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Authentication failed");
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (verifyError) throw new Error(verifyError.message);

      if (!data?.is_new_user) {
        toast.error("This mobile number is already registered. Please login instead.");
        await resetPhoneAuth();
        navigate("/app/login", { replace: true });
        return;
      }

      await supabase
        .from("customers")
        .update({
          name: form.name,
          email: form.email,
          occupation: form.occupation || null,
        } as never)
        .eq("id", data.customer?.id);

      toast.success("🎉 Registration successful!", { duration: 5000 });
      logActivity("registration", `New customer registered: ${form.name} (${form.email})`);
      navigate("/app/set-location", { replace: true });
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") toast.error("Invalid OTP.");
      else if (err.code === "auth/code-expired") toast.error("OTP expired.");
      else toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasScrolledToBottom(true);
  }, []);

  const openTermsPopup = () => {
    setHasScrolledToBottom(false);
    setShowTermsPopup(true);
  };

  const handleAgreeTerms = () => {
    setAcceptedTerms(true);
    setShowTermsPopup(false);
    toast.success("Terms & Privacy Policy accepted ✓");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary pt-10 pb-14 px-6 flex flex-col items-center relative">
        <Link to="/app/login" className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <img src={p4uLogoTeal} alt="Planext4u" className="h-16 w-16 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-lg font-bold">Create Account</h2>
        <p className="text-primary-foreground/60 text-xs">Join Planext4u and start shopping</p>
      </div>
      <div className="max-w-md mx-auto -mt-8 px-4 pb-8 relative z-10">
        <Card className="p-6 mt-2">
          {otpStep === "form" ? (
            <div className="space-y-4">
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="pl-10 h-11" /></div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="10-digit Mobile Number *" value={form.mobile} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setForm({ ...form, mobile: v }); }} className="pl-10 h-11" type="tel" maxLength={10} inputMode="numeric" />
                {form.mobile && form.mobile.length !== 10 && <p className="text-xs text-destructive mt-1">Must be 10 digits</p>}
              </div>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Email Address *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="pl-10 h-11" type="email" /></div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">State *</Label>
                <Select value={form.state} onValueChange={v => setForm({ ...form, state: v, district: "" })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {states.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">District *</Label>
                <Select value={form.district} onValueChange={v => setForm({ ...form, district: v })} disabled={!form.state}>
                  <SelectTrigger className="h-11"><SelectValue placeholder={form.state ? "Select District" : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {districts.length === 0 && form.state ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">Loading districts...</div>
                    ) : (
                      districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Input placeholder="Area / Locality" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="h-11" />

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Occupation</Label>
                <Select value={form.occupation} onValueChange={v => setForm({ ...form, occupation: v })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select Occupation" /></SelectTrigger>
                  <SelectContent>{occupations.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <Button type="button" variant="outline" className="w-full h-11 gap-2" onClick={captureLocation} disabled={geoLoading}>
                <MapPin className="h-4 w-4" /> {geoLoading ? "Capturing..." : location ? "📍 Location Captured" : "Capture Location"}
              </Button>

              <div className="relative"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Referral Code (optional)" value={form.referral_code} onChange={e => setForm({ ...form, referral_code: e.target.value.toUpperCase() })} className="pl-10 h-11" /></div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={(e) => { e.preventDefault(); if (!acceptedTerms) openTermsPopup(); }}>
                <Checkbox id="terms" checked={acceptedTerms} className="mt-0.5" onCheckedChange={() => { if (!acceptedTerms) openTermsPopup(); }} />
                <label className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  I have read and agree to the <span className="text-primary font-semibold underline">Terms & Conditions</span> and <span className="text-primary font-semibold underline">Privacy Policy</span>.
                  {!acceptedTerms && <span className="block text-[10px] text-primary mt-1">👆 Tap to read and accept</span>}
                </label>
              </div>

              <Button type="button" className="w-full h-12 text-base bg-primary gap-2" onClick={handleSendOTP} disabled={otpLoading || !acceptedTerms}>
                {otpLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : <>Verify & Register <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <p className="text-xs text-muted-foreground text-center">Already have an account? <Link to="/app/login" className="text-primary font-semibold hover:underline">Sign In</Link></p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-center">Verify Your Phone</h3>
              <p className="text-sm text-muted-foreground text-center">Enter the 6-digit OTP sent to +91 {form.mobile}</p>

              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <input key={i} type="text" inputMode="numeric" maxLength={1} value={otp[i] || ""} ref={i === 0 ? otpRef : undefined}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v) { const n = otp.split(""); n[i] = v; setOtp(n.join("").slice(0, 6)); const next = e.target.nextElementSibling as HTMLInputElement; if (next) next.focus(); } }}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i]) { const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement; if (prev) { prev.focus(); const n = otp.split(""); n[i - 1] = ""; setOtp(n.join("")); } } }}
                    onPaste={(e) => { e.preventDefault(); setOtp(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); }}
                  />
                ))}
              </div>

              <Button onClick={handleVerifyAndRegister} className="w-full h-12 text-base bg-primary gap-2" disabled={loading || otp.length < 6}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify & Create Account</>}
              </Button>

              <div className="text-center">
                {timer > 0 ? <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-primary">{timer}s</span></p> : <button onClick={async () => { setOtp(""); await resetPhoneAuth(); await new Promise(r => setTimeout(r, 400)); handleSendOTP(); }} className="text-sm text-primary font-semibold hover:underline">Resend OTP</button>}
              </div>
              <button onClick={async () => { setOtpStep("form"); setOtp(""); await resetPhoneAuth(); }} className="w-full text-sm text-muted-foreground hover:text-foreground">← Back to form</button>
            </div>
          )}
        </Card>
      </div>
      <div id="recaptcha-container" />

      <Dialog open={showTermsPopup} onOpenChange={setShowTermsPopup}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Terms & Privacy Policy
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Please scroll to the bottom to read all terms before accepting.</p>
          </DialogHeader>
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5">
            <TermsContent />
            <PrivacyContent />
            <div className="h-4" />
          </div>
          <div className="p-4 border-t bg-card shrink-0 space-y-2">
            {!hasScrolledToBottom && (
              <p className="text-xs text-destructive text-center animate-pulse">⬇️ Please scroll down to read all terms before accepting</p>
            )}
            <Button onClick={handleAgreeTerms} disabled={!hasScrolledToBottom} className="w-full h-11 gap-2">
              <ShieldCheck className="h-4 w-4" />
              {hasScrolledToBottom ? "I Agree to Terms & Privacy Policy" : "Scroll down to accept"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
