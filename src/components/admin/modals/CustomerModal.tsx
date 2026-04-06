import { User } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Mail, Phone, Star, Gift, Calendar, Trash2, ShieldCheck, ShoppingCart, Coins, Download, ChevronLeft, ChevronRight, FileText, CheckCircle, XCircle, Clock, Eye, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

interface CustomerModalProps {
  customer: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<User>) => Promise<void>;
  onCreate?: (data: Partial<User>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = { name: "", email: "", mobile: "", status: "active" as User["status"], occupation: "", city_id: "1", area_id: "1" };

export function CustomerModal({ customer, open, onOpenChange, mode, onSave, onCreate, onDelete }: CustomerModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("profile");

  // KYC data
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [kycLoading, setKycLoading] = useState(false);

  // Orders data
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("all");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersFromDate, setOrdersFromDate] = useState("");
  const [ordersToDate, setOrdersToDate] = useState("");
  const ordersPerPage = 5;

  // Points data
  const [points, setPoints] = useState<any[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsFilter, setPointsFilter] = useState<string>("all");
  const [pointsFromDate, setPointsFromDate] = useState("");
  const [pointsToDate, setPointsToDate] = useState("");
  const pointsPerPage = 8;

  // Profile completeness
  const [profileScore, setProfileScore] = useState<number | null>(null);

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm);
      setEditMode(true);
      setActiveTab("profile");
    } else if (customer) {
      setForm({ name: customer.name, email: customer.email, mobile: customer.mobile, status: customer.status, occupation: customer.occupation || "", city_id: customer.city_id, area_id: customer.area_id });
      setEditMode(mode === "edit");
    }
  }, [customer, mode]);

  // Fetch KYC docs when tab changes
  useEffect(() => {
    if (!customer || activeTab !== "kyc") return;
    setKycLoading(true);
    supabase.from("kyc_documents").select("*").eq("user_id", customer.id).order("created_at", { ascending: false })
      .then(({ data }) => { setKycDocs(data || []); setKycLoading(false); });
  }, [customer, activeTab]);

  // Fetch profile completeness
  useEffect(() => {
    if (!customer || isCreate) return;
    supabase.from("customers").select("profile_completeness").eq("id", customer.id).single()
      .then(({ data }) => { setProfileScore(data?.profile_completeness ?? null); });
  }, [customer]);

  // Fetch orders
  useEffect(() => {
    if (!customer || activeTab !== "orders") return;
    setOrdersLoading(true);
    const from = (ordersPage - 1) * ordersPerPage;
    supabase.from("orders").select("*", { count: "exact" }).eq("customer_id", customer.id)
      .order("created_at", { ascending: false }).range(from, from + ordersPerPage - 1)
      .then(({ data, count }) => { setOrders(data || []); setOrdersTotal(count || 0); setOrdersLoading(false); });
  }, [customer, activeTab, ordersPage]);

  // Fetch points
  useEffect(() => {
    if (!customer || activeTab !== "points") return;
    setPointsLoading(true);
    const from = (pointsPage - 1) * pointsPerPage;
    let query = supabase.from("points_transactions").select("*", { count: "exact" }).eq("user_id", customer.id)
      .order("created_at", { ascending: false });
    if (pointsFilter === "earned") query = query.gt("points", 0);
    if (pointsFilter === "redeemed") query = query.lt("points", 0);
    query.range(from, from + pointsPerPage - 1)
      .then(({ data, count }) => { setPoints(data || []); setPointsTotal(count || 0); setPointsLoading(false); });
  }, [customer, activeTab, pointsPage, pointsFilter]);

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      if (isCreate) { await onCreate?.(form); } else if (customer) { await onSave?.(customer.id, form); }
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setSaving(true);
    try { await onDelete?.(customer.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handleExportPoints = async () => {
    if (!customer) return;
    const { data } = await supabase.from("points_transactions").select("*").eq("user_id", customer.id).order("created_at", { ascending: false });
    if (!data?.length) { toast.info("No points data to export"); return; }
    exportToCSV(data, [
      { key: "id", label: "Transaction ID" },
      { key: "type", label: "Type" },
      { key: "points", label: "Points" },
      { key: "description", label: "Description" },
      { key: "created_at", label: "Date" },
    ], `points_statement_${customer.name.replace(/\s/g, '_')}`);
    toast.success("Points statement exported");
  };

  const kycStatusIcon = (status: string) => {
    if (status === "approved" || status === "verified") return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  const pointsTypeStyle: Record<string, string> = {
    welcome: "bg-primary/10 text-primary",
    referral: "bg-info/10 text-info",
    order_reward: "bg-success/10 text-success",
    redemption: "bg-destructive/10 text-destructive",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-card">{isCreate ? "+" : (customer?.name?.charAt(0) || "?")}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>{isCreate ? "New Customer" : customer?.name}</span>
                {profileScore !== null && !isCreate && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <div className="h-1.5 w-8 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${profileScore}%` }} />
                    </div>
                    {profileScore}%
                  </Badge>
                )}
              </div>
              {!isCreate && <p className="text-xs font-normal text-muted-foreground mt-0.5">{customer?.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && customer && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={customer.status} />
              <span className="text-xs text-muted-foreground">Joined {new Date(customer.created_at).toLocaleDateString()}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {isCreate ? (
          /* Create form - no tabs */
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Enter name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Occupation</Label>
                <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="mt-1" placeholder="Software Engineer" />
              </div>
            </div>
          </div>
        ) : (
          /* Tabbed view for existing customers */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="profile" className="text-xs gap-1"><FileText className="h-3 w-3" /> Profile</TabsTrigger>
              <TabsTrigger value="kyc" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> KYC</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs gap-1"><ShoppingCart className="h-3 w-3" /> Orders</TabsTrigger>
              <TabsTrigger value="points" className="text-xs gap-1"><Coins className="h-3 w-3" /> Points</TabsTrigger>
            </TabsList>

            {/* PROFILE TAB */}
            <TabsContent value="profile" className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name *</Label>
                  {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{customer?.name}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  {editMode ? (
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <div className="mt-1"><StatusBadge status={customer?.status || "active"} /></div>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                  {editMode ? <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{customer?.email}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                  {editMode ? <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{customer?.mobile}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Occupation</Label>
                  {editMode ? <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{customer?.occupation || "—"}</p>}
                </div>
              </div>

              {customer && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Star className="h-5 w-5 mx-auto text-warning mb-1" />
                    <p className="text-2xl font-bold">{customer.wallet_points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Wallet Points</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Gift className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-sm font-bold font-mono mt-1">{customer.referral_code}</p>
                    <p className="text-xs text-muted-foreground">Referral Code</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Calendar className="h-5 w-5 mx-auto text-info mb-1" />
                    <p className="text-sm font-bold mt-1">{new Date(customer.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* KYC TAB */}
            <TabsContent value="kyc" className="space-y-4 mt-3">
              {kycLoading ? (
                <div className="flex items-center justify-center h-32"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
              ) : kycDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No KYC documents submitted yet</p>
                  <Badge variant="outline" className="mt-2">KYC Not Started</Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  {kycDocs.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {kycStatusIcon(doc.status)}
                          <div>
                            <p className="text-sm font-medium capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {doc.document_number ? `${doc.document_number.slice(0, -4).replace(/./g, 'X')}${doc.document_number.slice(-4)}` : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={doc.status} />
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(doc.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      {doc.rejection_reason && (
                        <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                          <strong>Rejection Reason:</strong> {doc.rejection_reason}
                        </div>
                      )}
                      {doc.admin_notes && (
                        <p className="mt-2 text-xs text-muted-foreground"><strong>Admin Notes:</strong> {doc.admin_notes}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        {doc.front_image_url && (
                          <a href={doc.front_image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Front
                          </a>
                        )}
                        {doc.back_image_url && (
                          <a href={doc.back_image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Back
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {/* Profile Completeness */}
              {profileScore !== null && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Profile Completeness</p>
                    <span className="text-sm font-bold">{profileScore}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profileScore}%` }} />
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ORDERS TAB */}
            <TabsContent value="orders" className="space-y-3 mt-3">
              {ordersLoading ? (
                <div className="flex items-center justify-center h-32"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders placed yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <Card className="p-3 text-center">
                      <p className="text-lg font-bold">{ordersTotal}</p>
                      <p className="text-[10px] text-muted-foreground">Total Orders</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-lg font-bold text-success">
                        ₹{orders.reduce((s, o) => s + (o.total || 0), 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Page Total</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-lg font-bold text-warning">
                        {orders.filter(o => o.delivery_rating).length}/{orders.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Rated</p>
                    </Card>
                  </div>

                  {orders.map((o) => (
                    <Card key={o.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground">{o.id}</p>
                          <p className="text-sm font-medium mt-0.5">{o.vendor_name || 'Vendor'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(o.items as any[] || []).slice(0, 3).map((item: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{item.emoji || '📦'} {item.title} x{item.qty}</Badge>
                            ))}
                            {(o.items as any[] || []).length > 3 && <Badge variant="secondary" className="text-[10px]">+{(o.items as any[]).length - 3} more</Badge>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <StatusBadge status={o.status} />
                          <p className="text-sm font-bold mt-1">₹{o.total?.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>Sub: ₹{o.subtotal}</span>
                          <span>Tax: ₹{o.tax}</span>
                          <span>Disc: -₹{o.discount}</span>
                          {o.points_used > 0 && <span>Pts: -{o.points_used}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {o.delivery_rating ? (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < o.delivery_rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Not rated</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                        </div>
                      </div>
                      {o.rating_comment && <p className="text-xs text-muted-foreground mt-1 italic">"{o.rating_comment}"</p>}
                    </Card>
                  ))}

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Page {ordersPage} of {Math.ceil(ordersTotal / ordersPerPage)}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={ordersPage >= Math.ceil(ordersTotal / ordersPerPage)} onClick={() => setOrdersPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* POINTS TAB */}
            <TabsContent value="points" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {["all", "earned", "redeemed"].map((f) => (
                    <Button key={f} variant={pointsFilter === f ? "default" : "outline"} size="sm" className="h-7 text-xs capitalize"
                      onClick={() => { setPointsFilter(f); setPointsPage(1); }}>
                      {f}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportPoints}>
                  <Download className="h-3 w-3" /> Export
                </Button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 text-center">
                  <p className="text-lg font-bold text-success">{customer?.wallet_points?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Current Balance</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-lg font-bold">{pointsTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Total Transactions</p>
                </Card>
              </div>

              {pointsLoading ? (
                <div className="flex items-center justify-center h-24"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
              ) : points.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {points.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                        <div className="flex items-center gap-3">
                          <Badge className={`${pointsTypeStyle[t.type] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>
                            {t.type?.replace(/_/g, ' ')}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{t.description}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${t.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {t.points >= 0 ? '+' : ''}{t.points}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Page {pointsPage} of {Math.ceil(pointsTotal / pointsPerPage)}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={pointsPage <= 1} onClick={() => setPointsPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={pointsPage >= Math.ceil(pointsTotal / pointsPerPage)} onClick={() => setPointsPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && activeTab === "profile" && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {activeTab === "profile" || isCreate ? (
            editMode ? (
              <>
                <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.email}>
                  {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                  {isCreate ? "Create Customer" : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button onClick={() => setEditMode(true)}>Edit</Button>
              </>
            )
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
