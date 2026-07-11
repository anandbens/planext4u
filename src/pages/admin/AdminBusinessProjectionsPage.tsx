import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ProjectionRow {
  id: string;
  scenario: string;
  scenario_label: string;
  scenario_order: number;
  category: string;
  category_order: number;
  investment: number;
  members: number;
  turnover: number;
  gross_profit: number;
  net_profit: number;
  share_pct: number;
  category_profit: number;
  profit_per_person: number;
  spend_1: number;
  spend_10: number;
  spend_100: number;
  spend_1000: number;
  status: string;
  notes?: string | null;
}

const EMPTY: Partial<ProjectionRow> = {
  scenario: "",
  scenario_label: "",
  scenario_order: 1,
  category: "Micro",
  category_order: 1,
  investment: 0,
  members: 0,
  turnover: 0,
  gross_profit: 0,
  net_profit: 0,
  share_pct: 0,
  category_profit: 0,
  profit_per_person: 0,
  spend_1: 0,
  spend_10: 0,
  spend_100: 0,
  spend_1000: 0,
  status: "active",
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AdminBusinessProjectionsPage() {
  const [rows, setRows] = useState<ProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProjectionRow>>(EMPTY);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_projection_master")
      .select("*")
      .order("scenario_order", { ascending: true })
      .order("category_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.scenario_label.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.scenario.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectionRow[]>();
    filtered.forEach((r) => {
      if (!map.has(r.scenario_label)) map.set(r.scenario_label, []);
      map.get(r.scenario_label)!.push(r);
    });
    return Array.from(map.entries()).sort(
      (a, b) => (a[1][0]?.scenario_order || 0) - (b[1][0]?.scenario_order || 0),
    );
  }, [filtered]);

  const openNew = () => {
    setEditing(EMPTY);
    setDialogOpen(true);
  };
  const openEdit = (r: ProjectionRow) => {
    setEditing(r);
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      scenario: editing.scenario || editing.scenario_label?.toLowerCase().replace(/\s+/g, "_"),
      scenario_label: editing.scenario_label,
      scenario_order: Number(editing.scenario_order) || 0,
      category: editing.category,
      category_order: Number(editing.category_order) || 0,
      investment: Number(editing.investment) || 0,
      members: Number(editing.members) || 0,
      turnover: Number(editing.turnover) || 0,
      gross_profit: Number(editing.gross_profit) || 0,
      net_profit: Number(editing.net_profit) || 0,
      share_pct: Number(editing.share_pct) || 0,
      category_profit: Number(editing.category_profit) || 0,
      profit_per_person: Number(editing.profit_per_person) || 0,
      spend_1: Number(editing.spend_1) || 0,
      spend_10: Number(editing.spend_10) || 0,
      spend_100: Number(editing.spend_100) || 0,
      spend_1000: Number(editing.spend_1000) || 0,
      status: editing.status || "active",
      notes: editing.notes || null,
    };
    if (!payload.scenario_label || !payload.category) {
      toast.error("Scenario label & category are required");
      return;
    }
    let err;
    if (editing.id) {
      ({ error: err } = await (supabase as any)
        .from("business_projection_master")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error: err } = await (supabase as any)
        .from("business_projection_master")
        .insert(payload));
    }
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Saved");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this projection row?")) return;
    const { error } = await (supabase as any)
      .from("business_projection_master")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const field = (key: keyof ProjectionRow, label: string, type: "text" | "number" = "number") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(editing as any)[key] ?? ""}
        onChange={(e) => setEditing({ ...editing, [key]: e.target.value } as any)}
      />
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Business Projection Master
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure scenarios & category-level projections shown on franchise receipts.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search scenario or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No projection rows.</div>
      ) : (
        grouped.map(([label, items]) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Scenario — {label}</span>
                <Badge variant="secondary">{items.length} categories</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Turnover</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                    <TableHead className="text-right">Cat Profit</TableHead>
                    <TableHead className="text-right">Per Person</TableHead>
                    <TableHead className="text-right">₹1</TableHead>
                    <TableHead className="text-right">₹10</TableHead>
                    <TableHead className="text-right">₹100</TableHead>
                    <TableHead className="text-right">₹1000</TableHead>
                    <TableHead className="w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.category}</TableCell>
                      <TableCell className="text-right">{inr(r.investment)}</TableCell>
                      <TableCell className="text-right">{r.members}</TableCell>
                      <TableCell className="text-right">{inr(r.turnover)}</TableCell>
                      <TableCell className="text-right">{inr(r.net_profit)}</TableCell>
                      <TableCell className="text-right">{r.share_pct}%</TableCell>
                      <TableCell className="text-right">{inr(r.category_profit)}</TableCell>
                      <TableCell className="text-right">{inr(r.profit_per_person)}</TableCell>
                      <TableCell className="text-right">{inr(r.spend_1)}</TableCell>
                      <TableCell className="text-right">{inr(r.spend_10)}</TableCell>
                      <TableCell className="text-right">{inr(r.spend_100)}</TableCell>
                      <TableCell className="text-right">{inr(r.spend_1000)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit" : "Add"} Projection Row</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {field("scenario_label", "Scenario Label (e.g. 1 Lakh Users)", "text")}
            {field("scenario", "Scenario Key (e.g. 1_lakh)", "text")}
            {field("scenario_order", "Scenario Order")}
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={(editing.category as string) || "Micro"}
                onValueChange={(v) => setEditing({ ...editing, category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Micro">Micro</SelectItem>
                  <SelectItem value="Mini">Mini</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Nano">Nano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {field("category_order", "Category Order")}
            {field("investment", "Investment (₹)")}
            {field("members", "Members")}
            {field("turnover", "Turnover (₹)")}
            {field("gross_profit", "Gross Profit (₹)")}
            {field("net_profit", "Net Profit (₹)")}
            {field("share_pct", "Share %")}
            {field("category_profit", "Category Profit (₹)")}
            {field("profit_per_person", "Profit Per Person (₹)")}
            {field("spend_1", "User Spend ₹1/Day")}
            {field("spend_10", "User Spend ₹10/Day")}
            {field("spend_100", "User Spend ₹100/Day")}
            {field("spend_1000", "User Spend ₹1000/Day")}
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={(editing.status as string) || "active"}
                onValueChange={(v) => setEditing({ ...editing, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
