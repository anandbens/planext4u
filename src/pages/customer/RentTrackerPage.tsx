import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Calendar, IndianRupee, Check, Clock, Trash2, Edit, Download, Home, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RentTrackerPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = customerUser?.customer_id || customerUser?.id || "";
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [form, setForm] = useState({ property_title: "", landlord_name: "", landlord_phone: "", monthly_rent: "", due_date: "1" });

  const { data: trackers, isLoading } = useQuery({
    queryKey: ["rentTrackers", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("rent_payments" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  const handleAdd = async () => {
    if (!form.property_title || !form.monthly_rent) { toast.error("Fill required fields"); return; }
    const { error } = await supabase.from("rent_payments" as any).insert({
      user_id: userId,
      property_title: form.property_title,
      landlord_name: form.landlord_name,
      landlord_phone: form.landlord_phone,
      monthly_rent: Number(form.monthly_rent),
      due_date: Number(form.due_date),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Rent tracker added!");
    setShowAdd(false);
    setForm({ property_title: "", landlord_name: "", landlord_phone: "", monthly_rent: "", due_date: "1" });
    queryClient.invalidateQueries({ queryKey: ["rentTrackers"] });
  };

  const handleMarkPaid = async (tracker: any, month: string) => {
    const paid = Array.isArray(tracker.paid_months) ? [...tracker.paid_months] : [];
    if (paid.includes(month)) return;
    paid.push(month);
    await supabase.from("rent_payments" as any).update({ paid_months: paid } as any).eq("id", tracker.id);
    toast.success(`${month} marked as paid`);
    queryClient.invalidateQueries({ queryKey: ["rentTrackers"] });
    setShowPayment(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("rent_payments" as any).delete().eq("id", id);
    toast.success("Tracker removed");
    queryClient.invalidateQueries({ queryKey: ["rentTrackers"] });
  };

  const generateReceipt = (tracker: any, month: string) => {
    const receipt = `
RENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━
Property: ${tracker.property_title}
Month: ${month}
Amount: ₹${Number(tracker.monthly_rent).toLocaleString("en-IN")}
Landlord: ${tracker.landlord_name || "N/A"}
Tenant: ${customerUser?.name || "Tenant"}
Date: ${new Date().toLocaleDateString("en-IN")}
━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    const blob = new Blob([receipt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rent-receipt-${month}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <IndianRupee className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-24 md:pb-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Rent Tracker</h1>
          <Button size="sm" className="ml-auto text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : !trackers?.length ? (
            <div className="text-center py-16">
              <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No rent trackers</p>
              <p className="text-xs text-muted-foreground mt-1">Add a tracker to manage your monthly rent payments</p>
              <Button className="mt-4" size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Tracker
              </Button>
            </div>
          ) : (
            trackers.map((t: any) => {
              const paid = Array.isArray(t.paid_months) ? t.paid_months : [];
              const isDue = !paid.includes(`${MONTHS[currentMonth]} ${currentYear}`) && new Date().getDate() >= t.due_date;
              return (
                <Card key={t.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{t.property_title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <User className="h-3 w-3 inline mr-1" />{t.landlord_name || "Not set"}
                        {t.landlord_phone && <span className="ml-2"><Phone className="h-3 w-3 inline mr-1" />{t.landlord_phone}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{Number(t.monthly_rent).toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-muted-foreground">Due: {t.due_date}th of month</p>
                    </div>
                  </div>

                  {isDue && (
                    <div className="bg-destructive/10 rounded-lg p-2.5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive font-medium">Rent due for {MONTHS[currentMonth]} {currentYear}</p>
                      <Button size="sm" className="ml-auto text-[10px] h-7" onClick={() => setShowPayment(t)}>Pay Now</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-6 gap-1.5">
                    {MONTHS.map((m, i) => {
                      const key = `${m} ${currentYear}`;
                      const isPaid = paid.includes(key);
                      const isFuture = i > currentMonth;
                      return (
                        <button key={m} disabled={isFuture}
                          className={`text-[10px] py-1.5 rounded-md font-medium transition-colors ${
                            isPaid ? "bg-success/15 text-success" : isFuture ? "bg-muted text-muted-foreground/40" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                          onClick={() => !isPaid && !isFuture && setShowPayment({ ...t, selectedMonth: key })}>
                          {isPaid && <Check className="h-2.5 w-2.5 mx-auto mb-0.5" />}
                          {m}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7" onClick={() => setShowPayment(t)}>
                      <Check className="h-3 w-3 mr-1" /> Mark Paid
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => {
                      if (paid.length > 0) generateReceipt(t, paid[paid.length - 1]);
                      else toast.info("No paid months to generate receipt");
                    }}>
                      <Download className="h-3 w-3 mr-1" /> Receipt
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Add Tracker Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Add Rent Tracker</DialogTitle>
            <div className="space-y-3 pt-2">
              <div><Label className="text-xs">Property Name *</Label><Input value={form.property_title} onChange={(e) => setForm(f => ({ ...f, property_title: e.target.value }))} placeholder="e.g. 2BHK Koramangala" /></div>
              <div><Label className="text-xs">Monthly Rent (₹) *</Label><Input type="number" value={form.monthly_rent} onChange={(e) => setForm(f => ({ ...f, monthly_rent: e.target.value }))} placeholder="15000" /></div>
              <div><Label className="text-xs">Due Date (Day of month)</Label><Input type="number" min="1" max="28" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Landlord Name</Label><Input value={form.landlord_name} onChange={(e) => setForm(f => ({ ...f, landlord_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Landlord Phone</Label><Input value={form.landlord_phone} onChange={(e) => setForm(f => ({ ...f, landlord_phone: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleAdd}>Add Tracker</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mark Payment Dialog */}
        <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Mark Rent as Paid</DialogTitle>
            <div className="space-y-3 pt-2">
              <p className="text-sm">{showPayment?.property_title} — ₹{Number(showPayment?.monthly_rent || 0).toLocaleString("en-IN")}</p>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => {
                  const key = `${m} ${currentYear}`;
                  const isPaid = showPayment?.paid_months?.includes(key);
                  const isFuture = i > currentMonth;
                  return (
                    <button key={m} disabled={isPaid || isFuture}
                      className={`text-xs py-2 rounded-lg font-medium transition-colors ${
                        isPaid ? "bg-success/15 text-success" : isFuture ? "bg-muted text-muted-foreground/40" : 
                        showPayment?.selectedMonth === key ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                      }`}
                      onClick={() => handleMarkPaid(showPayment, key)}>
                      {isPaid && <Check className="h-3 w-3 mx-auto mb-0.5" />}
                      {m}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Tap a month to mark it as paid</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  );
}
