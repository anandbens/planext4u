import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { addToBlacklist } from "@/lib/coupons/fraud";
import { ShieldAlert, ShieldCheck, Ban, Smartphone, Users, Activity } from "lucide-react";

interface Rule {
  id: string; code: string; name: string; description: string | null;
  category: string; severity: string; action: string;
  score: number; threshold: number; window_seconds: number;
  priority: number; enabled: boolean;
}
interface BlacklistEntry {
  id: string; entity_type: string; entity_value: string;
  reason: string | null; severity: string; source: string;
  expires_at: string | null; created_at: string;
}
interface Alert {
  id: string; event: string; severity: string; score: number;
  customer_id: string | null; mobile: string | null;
  device_fingerprint: string | null; code: string | null;
  title: string; description: string | null; status: string; created_at: string;
}
interface Evaluation {
  id: string; event: string; action: string; score: number;
  customer_id: string | null; device_fingerprint: string | null;
  code: string | null; created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function AdminFraudPage() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <CouponAdminNav />
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-primary" />
        <h1 className="text-xl md:text-2xl font-semibold">Fraud Management</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="evaluations">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardPanel /></TabsContent>
        <TabsContent value="rules"><RulesPanel /></TabsContent>
        <TabsContent value="blacklist"><BlacklistPanel /></TabsContent>
        <TabsContent value="alerts"><AlertsPanel /></TabsContent>
        <TabsContent value="evaluations"><EvaluationsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ----- Dashboard ----- */
function DashboardPanel() {
  const [stats, setStats] = useState<{
    totalAttempts: number; blocked: number; alertsOpen: number;
    blacklistedDevices: number; blacklistedMobiles: number; blacklistedCustomers: number;
    topEvents: Array<{ event: string; count: number }>;
    topReasons: Array<{ reason: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [attempts, blocked, alerts, bl, evals] = await Promise.all([
        supabase.from("fraud_evaluations").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("fraud_evaluations").select("id", { count: "exact", head: true }).in("action", ["block", "blacklist"]).gte("created_at", since),
        supabase.from("fraud_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("fraud_blacklist").select("entity_type"),
        supabase.from("fraud_evaluations").select("event, matched_rules").gte("created_at", since).limit(1000),
      ]);

      const bcounts = { device: 0, mobile: 0, customer: 0 } as Record<string, number>;
      (bl.data ?? []).forEach((r: any) => { bcounts[r.entity_type] = (bcounts[r.entity_type] ?? 0) + 1; });

      const evtMap = new Map<string, number>();
      const reasonMap = new Map<string, number>();
      (evals.data ?? []).forEach((r: any) => {
        evtMap.set(r.event, (evtMap.get(r.event) ?? 0) + 1);
        (r.matched_rules ?? []).forEach((m: any) => {
          reasonMap.set(m.code, (reasonMap.get(m.code) ?? 0) + 1);
        });
      });

      setStats({
        totalAttempts: attempts.count ?? 0,
        blocked: blocked.count ?? 0,
        alertsOpen: alerts.count ?? 0,
        blacklistedDevices: bcounts.device ?? 0,
        blacklistedMobiles: bcounts.mobile ?? 0,
        blacklistedCustomers: bcounts.customer ?? 0,
        topEvents: [...evtMap.entries()].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count),
        topReasons: [...reasonMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      });
    })();
  }, []);

  if (!stats) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="grid gap-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Activity} label="Attempts (30d)" value={stats.totalAttempts} />
        <Stat icon={Ban} label="Blocked" value={stats.blocked} tone="text-red-600" />
        <Stat icon={ShieldAlert} label="Open Alerts" value={stats.alertsOpen} tone="text-orange-600" />
        <Stat icon={Smartphone} label="Blocked Devices" value={stats.blacklistedDevices} />
        <Stat icon={Smartphone} label="Blocked Mobiles" value={stats.blacklistedMobiles} />
        <Stat icon={Users} label="Blocked Customers" value={stats.blacklistedCustomers} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-3">Top Fraud Events (30d)</h3>
          {stats.topEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ul className="space-y-2">
              {stats.topEvents.map(e => (
                <li key={e.event} className="flex justify-between text-sm">
                  <span className="capitalize">{e.event.replace(/_/g, " ")}</span>
                  <Badge variant="secondary">{e.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-3">Top Triggered Rules (30d)</h3>
          {stats.topReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ul className="space-y-2">
              {stats.topReasons.map(r => (
                <li key={r.reason} className="flex justify-between text-sm">
                  <span className="font-mono text-xs">{r.reason}</span>
                  <Badge variant="secondary">{r.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${tone ?? ""}`}>{value}</div>
    </Card>
  );
}

/* ----- Rules ----- */
function RulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("fraud_rules").select("*").order("priority", { ascending: true });
    setRules((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Rule>) => {
    setBusy(id);
    const { error } = await supabase.from("fraud_rules").update(patch).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Rule updated");
    load();
  };

  return (
    <div className="mt-4 space-y-3">
      {rules.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{r.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{r.code}</Badge>
                <Badge className={SEVERITY_COLORS[r.severity]}>{r.severity}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                <LabeledInput label="Threshold" value={r.threshold}
                  onChange={(v) => update(r.id, { threshold: Number(v) || 0 })} />
                <LabeledInput label="Window (s)" value={r.window_seconds}
                  onChange={(v) => update(r.id, { window_seconds: Number(v) || 0 })} />
                <LabeledInput label="Score" value={r.score}
                  onChange={(v) => update(r.id, { score: Number(v) || 0 })} />
                <LabeledInput label="Priority" value={r.priority}
                  onChange={(v) => update(r.id, { priority: Number(v) || 0 })} />
                <div>
                  <label className="text-xs text-muted-foreground">Action</label>
                  <Select value={r.action} onValueChange={(v) => update(r.id, { action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["allow", "warn", "verify", "block", "blacklist"].map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} disabled={busy === r.id} />
              <span className="text-xs text-muted-foreground">{r.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LabeledInput({ label, value, onChange }: any) {
  const [v, setV] = useState<string>(String(value));
  useEffect(() => { setV(String(value)); }, [value]);
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onChange(v)} />
    </div>
  );
}

/* ----- Blacklist ----- */
function BlacklistPanel() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [entityType, setEntityType] = useState<"customer" | "mobile" | "device" | "ip" | "email">("mobile");
  const [entityValue, setEntityValue] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    let q = supabase.from("fraud_blacklist").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("entity_type", filter);
    const { data } = await q;
    setEntries((data ?? []) as any);
  };
  useEffect(() => { load(); }, [filter]);

  const add = async () => {
    if (!entityValue.trim()) { toast.error("Enter a value"); return; }
    try {
      await addToBlacklist(entityType, entityValue.trim(), reason.trim() || undefined);
      toast.success("Added to blacklist");
      setEntityValue(""); setReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("fraud_blacklist").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); load(); }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-3">Add to Blacklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select value={entityType} onValueChange={(v: any) => setEntityType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["customer", "mobile", "device", "ip", "email"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Value (mobile / id / fingerprint / IP)"
            value={entityValue} onChange={(e) => setEntityValue(e.target.value)} className="md:col-span-2" />
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={add}>Blacklist</Button>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Filter</label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["customer", "mobile", "device", "ip", "email"].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Type</th><th className="p-2">Value</th>
              <th className="p-2">Reason</th><th className="p-2">Severity</th>
              <th className="p-2">Source</th><th className="p-2">Added</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2"><Badge variant="outline">{e.entity_type}</Badge></td>
                <td className="p-2 font-mono text-xs break-all max-w-xs">{e.entity_value}</td>
                <td className="p-2">{e.reason ?? "—"}</td>
                <td className="p-2"><Badge className={SEVERITY_COLORS[e.severity]}>{e.severity}</Badge></td>
                <td className="p-2">{e.source}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove(e.id)}>Remove</Button></td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No blacklist entries</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ----- Alerts ----- */
function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<string>("open");

  const load = async () => {
    let q = supabase.from("fraud_alerts").select("*").order("created_at", { ascending: false }).limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setAlerts((data ?? []) as any);
  };
  useEffect(() => { load(); }, [status]);

  const setAlertStatus = async (id: string, s: string) => {
    const patch: any = { status: s };
    if (s === "resolved" || s === "false_positive") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("fraud_alerts").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="false_positive">False positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {alerts.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No alerts</p>}
      {alerts.map(a => (
        <Card key={a.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SEVERITY_COLORS[a.severity]}>{a.severity}</Badge>
                <span className="font-medium">{a.title}</span>
                <Badge variant="outline">score {a.score}</Badge>
                <Badge variant="secondary">{a.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 break-words">{a.description}</p>
              <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {a.customer_id && <span>Customer: <span className="font-mono">{a.customer_id.slice(0, 12)}…</span></span>}
                {a.mobile && <span>Mobile: {a.mobile}</span>}
                {a.device_fingerprint && <span>Device: <span className="font-mono">{a.device_fingerprint.slice(0, 12)}…</span></span>}
                {a.code && <span>Code: {a.code}</span>}
                <span>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {a.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => setAlertStatus(a.id, "resolved")}>Resolve</Button>}
              {a.status !== "false_positive" && <Button size="sm" variant="ghost" onClick={() => setAlertStatus(a.id, "false_positive")}>False +</Button>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ----- Evaluations (audit log) ----- */
function EvaluationsPanel() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("fraud_evaluations")
        .select("id,event,action,score,customer_id,device_fingerprint,code,created_at")
        .order("created_at", { ascending: false }).limit(300);
      setRows((data ?? []) as any);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      r.event.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      (r.customer_id ?? "").toLowerCase().includes(q) ||
      (r.device_fingerprint ?? "").toLowerCase().includes(q) ||
      (r.code ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="mt-4 space-y-3">
      <Input placeholder="Search event / customer / device / code…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">When</th><th className="p-2">Event</th><th className="p-2">Action</th>
              <th className="p-2">Score</th><th className="p-2">Customer</th>
              <th className="p-2">Device</th><th className="p-2">Code</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{r.event.replace(/_/g, " ")}</td>
                <td className="p-2">
                  <Badge className={
                    r.action === "block" || r.action === "blacklist" ? "bg-red-100 text-red-700"
                      : r.action === "verify" ? "bg-orange-100 text-orange-700"
                      : r.action === "warn" ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }>{r.action}</Badge>
                </td>
                <td className="p-2">{r.score}</td>
                <td className="p-2 font-mono text-xs">{r.customer_id?.slice(0, 12) ?? "—"}</td>
                <td className="p-2 font-mono text-xs">{r.device_fingerprint?.slice(0, 12) ?? "—"}</td>
                <td className="p-2">{r.code ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No evaluations</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
