import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { validatePhoneFormat, validateEmailFormat } from "@/lib/registration-validation";
import { api } from "@/lib/api";
import { useCountry } from "@/lib/country-context";
import { friendlyError } from "@/lib/friendly-error";
import p4uLogo from "@/assets/p4u-logo.webp";

const ADVANCE_MIN = 50000;
const TOTAL_STEPS = 3;

type FranchisePlan = {
  id: string;
  name: string;
  investment_amount: number;
  validity_months: number;
  coverage_type: string;
  delivery_radius_km: number | null;
  description: string | null;
};

export default function PublicFranchiseRegistrationPage() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const isIndia = country.code === "IN";
  const regionLabel = isIndia ? "District" : "City";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<FranchisePlan[]>([]);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    mobile: "",
    company_name: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    country: country.name || "India",
    requested_territory: "",
    notes: "",
  });

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState(ADVANCE_MIN);
  const [paymentMode, setPaymentMode] = useState<"online" | "manual">("online");
  const [manualMode, setManualMode] = useState<"upi" | "bank_transfer" | "neft" | "rtgs" | "cheque" | "cash">("upi");
  const [transactionRef, setTransactionRef] = useState("");

  useEffect(() => {
    (supabase as any)
      .from("franchise_plans")
      .select("id,name,investment_amount,validity_months,coverage_type,delivery_radius_km,description")
      .eq("status", "active")
      .order("sort_order")
      .then(({ data }: any) => setPlans(data || []));
    api.getStates(country.code).then(setStates);
  }, [country.code]);

  useEffect(() => {
    if (!form.state) { setDistricts([]); return; }
    if (isIndia) {
      const st = states.find(s => s.name === form.state);
      if (st) api.getDistricts(st.id).then(setDistricts);
    } else {
      api.getCitiesByCountry(country.code, form.state).then(cities =>
        setDistricts(cities.map(c => ({ id: c.id, name: c.name })))
      );
    }
  }, [form.state, states, isIndia, country.code]);

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId]);
  const planPrice = Number(selectedPlan?.investment_amount || 0);
  const requiredAdvance = Math.min(ADVANCE_MIN, planPrice || ADVANCE_MIN);
  const balanceDue = Math.max(0, planPrice - advanceAmount);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (step === 1) {
      if (!form.applicant_name.trim() || form.applicant_name.trim().length < 2) return "Applicant name is required";
      const em = validateEmailFormat(form.email); if (em) return em;
      const ph = validatePhoneFormat(form.mobile); if (ph) return ph;
      if (!form.state) return "State is required";
      if (!form.district) return `${regionLabel} is required`;
      if (!form.requested_territory.trim()) return "Requested territory is required";
    }
    if (step === 2) {
      if (!selectedPlanId) return "Please select a franchise plan";
      if (!advanceAmount || advanceAmount < requiredAdvance) return `Advance must be at least ₹${requiredAdvance.toLocaleString("en-IN")}`;
      if (advanceAmount > planPrice) return "Advance cannot exceed the plan investment amount";
      if (paymentMode === "manual" && !transactionRef.trim()) return "Transaction/UTR reference is required for manual payment";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate(); if (err) { toast.error(err); return; }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleSubmit = async () => {
    const err = validate(); if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const payload: any = {
        applicant_name: form.applicant_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        company_name: form.company_name.trim() || null,
        address: form.address.trim() || null,
        city: form.district,
        district: form.district,
        state: form.state,
        pincode: form.pincode.trim() || null,
        country: form.country,
        requested_territory: form.requested_territory.trim(),
        notes: form.notes.trim() || null,
        plan_id: selectedPlanId,
        status: "submitted",
      };

      const { data: newRegId, error } = await (supabase as any)
        .rpc("submit_public_franchise_registration", { payload });
      if (error) {
        console.error('[franchise-register] submit_public_franchise_registration failed', { code: error.code, message: error.message, details: error.details, hint: error.hint, payloadKeys: Object.keys(payload) });
        toast.error(friendlyError(error, "Could not save your franchise registration. Please review your details and try again."));
        setLoading(false);
        return;
      }
      const registrationId = newRegId as string | null;
      if (!registrationId) {
        console.error('[franchise-register] RPC returned null registration id');
        toast.error("Registration did not return a reference. Please try again or contact support.");
        setLoading(false);
        return;
      }

      let paymentStatus: "paid" | "pending" | "partial" = "pending";
      let paidAmount = 0;
      let txnRef = transactionRef.trim() || null;
      let dbPaymentMode: "upi" | "bank_transfer" | "neft" | "rtgs" | "cash" | "cheque" = manualMode;

      if (paymentMode === "online" && selectedPlan && advanceAmount > 0) {
        try {
          const { data: orderRes, error: orderErr } = await supabase.functions.invoke("razorpay", {
            body: {
              action: "create_order",
              amount: advanceAmount,
              currency: "INR",
              notes: { entity_type: "franchise", registration_id: registrationId || "", plan_id: selectedPlan.id },
            },
          });
          if (orderErr || !orderRes?.order_id) {
            console.error('[franchise-register] razorpay create_order failed', { orderErr, orderRes });
            throw new Error(orderRes?.error || orderErr?.message || "Could not create payment order");
          }
          const rzp = await openRazorpayCheckout({
            keyId: orderRes.key_id,
            orderId: orderRes.order_id,
            amount: orderRes.amount,
            currency: orderRes.currency || "INR",
            name: "Planext4U",
            description: `Franchise registration advance – ${selectedPlan.name}`,
            prefill: { name: form.applicant_name, email: form.email, contact: form.mobile },
            method: "upi" as any,
            notes: { entity_type: "franchise", registration_id: registrationId || "", plan_id: selectedPlan.id },
          });
          txnRef = rzp.razorpay_payment_id;
          dbPaymentMode = "upi";
          paidAmount = advanceAmount;
          paymentStatus = balanceDue > 0 ? "partial" : "paid";
        } catch (payErr: any) {
          console.error('[franchise-register] online payment failed', payErr);
          toast.error(friendlyError(payErr, "Payment was cancelled. Your registration is saved as pending payment."));
        }
      } else if (paymentMode === "manual" && selectedPlan) {
        paidAmount = advanceAmount;
        paymentStatus = balanceDue > 0 ? "partial" : "paid";
      }

      if (registrationId && selectedPlan) {
        const { error: payLogErr } = await (supabase as any).rpc("record_public_registration_payment", {
          payload: {
            entity_type: "franchise",
            entity_id: registrationId,
            plan_id: selectedPlan.id,
            plan_amount: planPrice,
            amount_paid: paidAmount,
            balance: Math.max(0, planPrice - paidAmount),
            payment_mode: dbPaymentMode,
            payment_status: paymentStatus,
            transaction_ref: txnRef,
            payment_date: paidAmount > 0 ? new Date().toISOString() : null,
            remarks: paymentMode === "manual" ? `Manual advance via ${manualMode}` : "Online advance via Razorpay",
            metadata: { source: "public_franchise_registration" },
          },
        });
        if (payLogErr) {
          console.error('[franchise-register] record_public_registration_payment failed', { code: payLogErr.code, message: payLogErr.message, details: payLogErr.details, hint: payLogErr.hint });
          toast.warning(friendlyError(payLogErr, "Registration saved, but the payment entry couldn't be recorded. Our team will reconcile it manually."));
        }
      }

      toast.success("Franchise application submitted! Our team will contact you within 48 hours.");
      navigate("/");
    } catch (err: any) {
      console.error('[franchise-register] unexpected failure', err);
      toast.error(friendlyError(err, "Registration could not be completed. Please try again."));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1 h-7 w-7 flex items-center justify-center">
              <img loading="lazy" decoding="async" src={p4uLogo} alt="P4U" className="w-full h-full object-contain" width={1024} height={1024} />
            </div>
            <h1 className="text-base font-bold">Franchise Registration</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Step {step} of {TOTAL_STEPS}</p>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
          <div className="flex justify-between mt-2">
            {["Applicant", "Plan & Payment", "Review"].map((l, i) => (
              <button key={l} onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                className={`text-[10px] ${step === i + 1 ? "text-primary font-bold" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
        </Card>

        {step === 1 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Applicant Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input value={form.applicant_name} onChange={e => update("applicant_name", e.target.value)} maxLength={100} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Company Name</label>
                <Input value={form.company_name} onChange={e => update("company_name", e.target.value)} maxLength={200} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Mobile *</label>
                <Input value={form.mobile} onChange={e => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} inputMode="numeric" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">State *</label>
                <Select value={form.state} onValueChange={v => { update("state", v); update("district", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {states.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">{regionLabel} *</label>
                <Select value={form.district} onValueChange={v => update("district", v)} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? `Select ${regionLabel}` : "Select state first"} /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[9999]" position="popper" sideOffset={4}>
                    {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Pincode</label>
                <Input value={form.pincode} onChange={e => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Address</label>
                <Input value={form.address} onChange={e => update("address", e.target.value)} maxLength={500} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Requested Territory *</label>
                <Input value={form.requested_territory} onChange={e => update("requested_territory", e.target.value)} placeholder="e.g. North Chennai, Coimbatore Region" maxLength={200} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} maxLength={1000} rows={3} /></div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Choose Franchise Plan</h3>
            <div className="grid grid-cols-1 gap-2">
              {plans.length === 0 && <p className="text-xs text-muted-foreground">No franchise plans available yet.</p>}
              {plans.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPlanId(p.id)}
                  className={`text-left p-3 rounded-lg border-2 transition ${selectedPlanId === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-sm font-bold text-primary">₹{Number(p.investment_amount).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Validity {p.validity_months} mo · {p.coverage_type}
                    {p.delivery_radius_km ? ` · ${p.delivery_radius_km} km` : ""}
                  </p>
                  {p.description && <p className="text-[11px] text-muted-foreground mt-1">{p.description}</p>}
                </button>
              ))}
            </div>

            {selectedPlan && (
              <div className="border-t pt-3 space-y-3">
                <div className="p-3 rounded-lg bg-secondary/50 grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Investment</span>
                  <span className="font-semibold text-right">₹{planPrice.toLocaleString("en-IN")}</span>
                  <span className="text-muted-foreground">Minimum Advance</span>
                  <span className="font-semibold text-right">₹{requiredAdvance.toLocaleString("en-IN")}</span>
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-semibold text-right">₹{balanceDue.toLocaleString("en-IN")}</span>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Advance Amount (₹) *</label>
                  <Input type="number" min={requiredAdvance} max={planPrice}
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(Number(e.target.value) || 0)} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Must be between ₹{requiredAdvance.toLocaleString("en-IN")} and ₹{planPrice.toLocaleString("en-IN")}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Payment Mode *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(["online", "manual"] as const).map(m => (
                      <button key={m} type="button" onClick={() => setPaymentMode(m)}
                        className={`p-2 rounded-lg border-2 text-xs font-semibold capitalize ${paymentMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                        {m === "online" ? "Online (Razorpay)" : "Manual (UPI / Bank)"}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMode === "manual" && (
                  <div className="grid grid-cols-1 gap-2">
                    <Select value={manualMode} onValueChange={(v: any) => setManualMode(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="neft">NEFT</SelectItem>
                        <SelectItem value="rtgs">RTGS</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Transaction / UTR / Reference Number *"
                      value={transactionRef} onChange={e => setTransactionRef(e.target.value)} maxLength={64} />
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {step === 3 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Review & Submit</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-muted-foreground">Applicant</p><p className="font-medium">{form.applicant_name}</p>
                <p className="text-muted-foreground">Email</p><p className="font-medium">{form.email}</p>
                <p className="text-muted-foreground">Mobile</p><p className="font-medium">{form.mobile}</p>
                <p className="text-muted-foreground">Territory</p><p className="font-medium">{form.requested_territory}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                <p className="text-muted-foreground">Plan</p><p className="font-medium">{selectedPlan?.name || "—"}</p>
                <p className="text-muted-foreground">Investment</p><p className="font-medium">₹{planPrice.toLocaleString("en-IN")}</p>
                <p className="text-muted-foreground">Advance</p><p className="font-medium">₹{advanceAmount.toLocaleString("en-IN")}</p>
                <p className="text-muted-foreground">Balance</p><p className="font-medium">₹{balanceDue.toLocaleString("en-IN")}</p>
                <p className="text-muted-foreground">Payment</p><p className="font-medium capitalize">{paymentMode === "online" ? "Online (Razorpay)" : `Manual · ${manualMode}`}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 h-12 rounded-xl">Back</Button>}
          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">Next</Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting & Paying...</> : (paymentMode === "online" ? `Pay ₹${advanceAmount.toLocaleString("en-IN")} & Submit` : "Submit Application")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
