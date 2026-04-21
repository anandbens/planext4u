// Admin panel — manage which payment gateways are enabled per country.
// Lets the admin toggle Razorpay (IN), Paystack (NG), and Stripe (US/global),
// pick the default, and store the public key. Secret keys live in edge function
// secrets (PAYSTACK_SECRET_KEY, RAZORPAY_KEY_SECRET) and are never exposed here.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, ShieldAlert, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GatewayRow {
  id: string;
  country_code: string;
  gateway: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
  public_key: string | null;
  mode: string;
  display_order: number;
}

export function PaymentGatewaysPanel() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<GatewayRow>>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["countryPaymentGateways"],
    queryFn: async () => {
      const { data } = await supabase
        .from("country_payment_gateways")
        .select("*")
        .order("country_code")
        .order("display_order");
      return (data as GatewayRow[]) || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: GatewayRow) => {
      const patch = edits[row.id] || {};
      const { error } = await supabase
        .from("country_payment_gateways")
        .update({
          is_enabled: patch.is_enabled ?? row.is_enabled,
          is_default: patch.is_default ?? row.is_default,
          public_key: patch.public_key ?? row.public_key,
          mode: patch.mode ?? row.mode,
        })
        .eq("id", row.id);
      if (error) throw error;
      // Ensure only one default per country
      if ((patch.is_default ?? row.is_default) === true) {
        await supabase
          .from("country_payment_gateways")
          .update({ is_default: false })
          .eq("country_code", row.country_code)
          .neq("id", row.id);
      }
    },
    onSuccess: (_, row) => {
      toast.success(`${row.display_name} updated`);
      setEdits((e) => {
        const c = { ...e };
        delete c[row.id];
        return c;
      });
      qc.invalidateQueries({ queryKey: ["countryPaymentGateways"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = rows.reduce<Record<string, GatewayRow[]>>((acc, r) => {
    (acc[r.country_code] ||= []).push(r);
    return acc;
  }, {});

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold">Payment Gateways by Country</h3>
          <p className="text-xs text-muted-foreground">
            Enable gateways and set the default per country. Secret keys are stored as backend secrets.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([country, list]) => (
        <div key={country} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{country}</Badge>
            <span className="text-sm font-medium">{list[0]?.display_name?.split(" ")[0]} region</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((row) => {
              const draft = { ...row, ...(edits[row.id] || {}) };
              const dirty = !!edits[row.id];
              return (
                <div key={row.id} className="border rounded-xl p-4 space-y-3 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize">{row.gateway}</p>
                      <p className="text-xs text-muted-foreground">{row.display_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {draft.is_default && (
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Default
                        </Badge>
                      )}
                      <Switch
                        checked={draft.is_enabled}
                        onCheckedChange={(v) =>
                          setEdits((e) => ({ ...e, [row.id]: { ...e[row.id], is_enabled: v } }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Mode</Label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={draft.mode}
                        onChange={(e) =>
                          setEdits((s) => ({ ...s, [row.id]: { ...s[row.id], mode: e.target.value } }))
                        }
                      >
                        <option value="test">Test</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!draft.is_default}
                          onChange={(e) =>
                            setEdits((s) => ({ ...s, [row.id]: { ...s[row.id], is_default: e.target.checked } }))
                          }
                        />
                        Set as default
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Public Key</Label>
                    <Input
                      value={draft.public_key || ""}
                      placeholder={row.gateway === "paystack" ? "pk_test_…" : row.gateway === "razorpay" ? "rzp_test_…" : "pk_…"}
                      onChange={(e) =>
                        setEdits((s) => ({ ...s, [row.id]: { ...s[row.id], public_key: e.target.value } }))
                      }
                      className="h-9 font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Secret key is stored as backend secret (
                      {row.gateway === "paystack" ? "PAYSTACK_SECRET_KEY" : row.gateway === "razorpay" ? "RAZORPAY_KEY_SECRET" : "STRIPE_SECRET_KEY"}
                      ).
                    </p>
                  </div>

                  {dirty && (
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate(row)}
                      disabled={saveMutation.isPending}
                      className="w-full gap-2"
                    >
                      <Save className="h-3.5 w-3.5" /> Save changes
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
}
