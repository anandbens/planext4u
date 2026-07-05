/**
 * CustomerCouponsPage — "My Coupons" screen with Available / Used / Expired tabs.
 * Search + filters + audit logging + coupon details dialog. All coupon
 * visibility is dynamic and driven by the Eligibility Engine.
 */
import { useEffect, useMemo, useState } from "react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Copy, Ticket, Search, RefreshCw, Info, CalendarX, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CouponDetailsDialog } from "@/components/customer/CouponDetailsDialog";
import { logCouponAudit } from "@/lib/coupons/audit";

type Tab = "available" | "used" | "expired";

export default function CustomerCouponsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || "";

  const [tab, setTab] = useState<Tab>("available");
  const [available, setAvailable] = useState<any[]>([]);
  const [used, setUsed] = useState<any[]>([]);
  const [expired, setExpired] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "expiry" | "discount">("newest");
  const [discountFilter, setDiscountFilter] = useState<"all" | "percent" | "flat">("all");
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { timeout: 5000 }
      );
    }
  }, []);

  const load = async () => {
    if (!customerId) return;
    const [avail, redemps, campaignsExpired] = await Promise.all([
      (supabase.rpc as any)("get_customer_available_coupons", {
        _customer_id: customerId,
        _lat: coords?.lat ?? null, _lng: coords?.lng ?? null,
      }),
      supabase.from("coupon_redemptions")
        .select("*, coupon_campaigns(name, discount_type, discount_value, popup_image_url)")
        .eq("customer_id", customerId)
        .order("redeemed_at", { ascending: false }),
      // Expired: campaigns the customer had access to but end_date passed OR status = expired.
      // Simplest approach: their prior redemptions where rolled_back = true, PLUS all campaigns
      // with end_date < now that were once popup-eligible (best-effort).
      supabase.from("coupon_campaigns")
        .select("id, name, code, discount_type, discount_value, end_date, status, popup_image_url")
        .lt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false })
        .limit(50),
    ]);
    setAvailable((avail.data as any) || []);
    setUsed((redemps.data as any) || []);
    setExpired(((campaignsExpired.data as any) || []).map((c: any) => ({
      ...c,
      code: c.code,
      campaign_id: c.id,
      reason: c.status === "cancelled" ? "Cancelled" : c.status === "closed" ? "Campaign Closed" : "Expired",
    })));
    setLoading(false);
    setRefreshing(false);
    logCouponAudit({ event: "coupon_viewed", customerId, metadata: { surface: "my_coupons", tab } });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [customerId, coords?.lat, coords?.lng]);

  const refresh = () => { setRefreshing(true); load(); };

  const copy = (code: string, campaign_id?: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied — paste it at checkout`);
    logCouponAudit({ event: "coupon_copied", customerId, campaignId: campaign_id, code });
  };

  const filteredAvailable = useMemo(() => {
    let list = available.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    if (discountFilter !== "all") {
      list = list.filter(c => (discountFilter === "percent" ? c.discount_type === "percent" : c.discount_type !== "percent"));
    }
    list.sort((a, b) => {
      if (sortBy === "expiry") return new Date(a.expires_at || 0).getTime() - new Date(b.expires_at || 0).getTime();
      if (sortBy === "discount") return (b.discount_value || 0) - (a.discount_value || 0);
      return 0;
    });
    return list;
  }, [available, search, sortBy, discountFilter]);

  const filteredUsed = useMemo(() => {
    if (!search.trim()) return used;
    const q = search.toLowerCase();
    return used.filter(r =>
      r.code?.toLowerCase().includes(q) ||
      r.coupon_campaigns?.name?.toLowerCase().includes(q)
    );
  }, [used, search]);

  const filteredExpired = useMemo(() => {
    if (!search.trim()) return expired;
    const q = search.toLowerCase();
    return expired.filter(r => r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q));
  }, [expired, search]);

  const daysLeft = (d?: string) => {
    if (!d) return null;
    const ms = new Date(d).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  };

  return (
    <CustomerLayout>
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">My Coupons</h1>
            <p className="text-xs text-muted-foreground">Apply codes at checkout to save on eligible items.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={refresh} aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search coupon, vendor or code…"
              className="pl-9 h-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {tab === "available" && (
            <>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32 h-10"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="expiry">Ending Soon</SelectItem>
                  <SelectItem value="discount">Highest Discount</SelectItem>
                </SelectContent>
              </Select>
              <Select value={discountFilter} onValueChange={(v: any) => setDiscountFilter(v)}>
                <SelectTrigger className="w-28 h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="percent">% Off</SelectItem>
                  <SelectItem value="flat">Flat ₹</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="available">Available <Badge className="ml-2 h-4 px-1.5 text-[10px]" variant="secondary">{filteredAvailable.length}</Badge></TabsTrigger>
            <TabsTrigger value="used">Used <Badge className="ml-2 h-4 px-1.5 text-[10px]" variant="secondary">{filteredUsed.length}</Badge></TabsTrigger>
            <TabsTrigger value="expired">Expired <Badge className="ml-2 h-4 px-1.5 text-[10px]" variant="secondary">{filteredExpired.length}</Badge></TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
          ) : (
            <>
              <TabsContent value="available" className="space-y-2 mt-3">
                {filteredAvailable.length === 0 && (
                  <EmptyState icon={Tag} title="No active coupons available." hint="Check back soon — new offers drop regularly." />
                )}
                {filteredAvailable.map(c => {
                  const dl = daysLeft(c.expires_at);
                  return (
                    <Card key={c.campaign_id + c.code} className="p-4 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="font-bold">{c.name}</h3>
                            {dl !== null && dl <= 3 && <Badge variant="destructive" className="text-[10px]">{dl}d left</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <div className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded">{c.code}</div>
                            <Button size="sm" variant="outline" onClick={() => copy(c.code, c.campaign_id)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                            <Button size="sm" variant="ghost" onClick={() => setDetail(c)}><Info className="w-3 h-3 mr-1" />Details</Button>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-2">
                            {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                            {c.max_discount ? ` (max ₹${c.max_discount})` : ""}
                            {c.min_order_amount > 0 ? ` · Min order ₹${c.min_order_amount}` : ""}
                            {c.expires_at ? ` · Expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-3" onClick={() => {
                        logCouponAudit({ event: "coupon_applied", customerId, campaignId: c.campaign_id, code: c.code });
                        navigate("/app/cart");
                      }}>Apply Now</Button>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="used" className="space-y-2 mt-3">
                {filteredUsed.length === 0 && (
                  <EmptyState icon={CheckCircle2} title="You haven't used any coupons yet." hint="Redeemed coupons will appear here." />
                )}
                {filteredUsed.map(r => (
                  <Card key={r.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold text-sm truncate">
                          <Ticket className="w-3.5 h-3.5 text-success" />
                          {r.coupon_campaigns?.name || r.code}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{r.code}</div>
                        {r.order_id && <div className="text-[11px] text-muted-foreground">Order #{String(r.order_id).slice(0, 8)}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-success text-sm font-bold">- ₹{Number(r.discount_amount).toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString()}</div>
                        <Badge variant={r.rolled_back ? "destructive" : "secondary"} className="text-[9px] mt-1">
                          {r.rolled_back ? "Rolled back" : "Redeemed"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="expired" className="space-y-2 mt-3">
                {filteredExpired.length === 0 && (
                  <EmptyState icon={CalendarX} title="No expired coupons." hint="Coupons past their validity will appear here." />
                )}
                {filteredExpired.map((c: any) => (
                  <Card key={c.id} className="p-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{c.code || "—"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px]">{c.reason}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {c.end_date ? new Date(c.end_date).toLocaleDateString() : ""}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </>
          )}
        </Tabs>

        <CouponDetailsDialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)} coupon={detail} customerId={customerId} />
      </div>
    </CustomerLayout>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
