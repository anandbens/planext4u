import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, AlertTriangle, CheckCircle2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/lib/country-context";

interface Country {
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  flag_emoji: string | null;
  is_active: boolean;
  is_default: boolean;
  default_tax_rate: number;
  tax_label: string;
}

interface PlatformSettings {
  active_country_code: string;
  odoo_enabled: boolean;
  dropshipping_enabled: boolean;
}

export function CountrySwitcherPanel() {
  const { country, refresh } = useCountry();
  const [countries, setCountries] = useState<Country[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from("countries").select("*").order("display_order"),
      supabase.from("platform_settings" as any).select("active_country_code, odoo_enabled, dropshipping_enabled").eq("id", 1).maybeSingle(),
    ]);
    setCountries((cs as any as Country[]) || []);
    setSettings((ps as any) || null);
    setTarget((ps as any)?.active_country_code ?? "IN");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSwitch = async () => {
    if (!target || target === settings?.active_country_code) {
      toast.info("Select a different country to switch");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the country switch (audit log)");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("switch_active_country", {
      _to_code: target,
      _reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Switch failed");
      return;
    }
    toast.success(`Active country switched to ${target}`);
    setReason("");
    await Promise.all([load(), refresh()]);
  };

  const toggleFlag = async (key: "odoo_enabled" | "dropshipping_enabled", value: boolean) => {
    const { error } = await supabase
      .from("platform_settings" as any)
      .update({ [key]: value } as any)
      .eq("id", 1);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${key.replace("_", " ")} ${value ? "enabled" : "disabled"}`);
    load();
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Active Country & Platform Mode</h3>
          <p className="text-sm text-muted-foreground">
            Switch the platform between deployment regions. This changes currency, tax rules, and the default payment gateway across the entire app.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Currently active</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <span>{country.flag_emoji}</span>
              <span>{country.name}</span>
              <Badge variant="default" className="ml-2">
                {country.currency_code} ({country.currency_symbol})
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {country.tax_label} default {country.default_tax_rate}%
            </p>
          </div>
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Label className="text-sm font-semibold">Switch Active Country</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {countries.map((c) => {
            const active = settings?.active_country_code === c.code;
            const selected = target === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setTarget(c.code)}
                disabled={!c.is_active}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                } ${!c.is_active ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{c.flag_emoji}</span>
                  {active && <Badge className="text-[10px]">Active</Badge>}
                </div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.currency_code} • {c.currency_symbol} • {c.tax_label} {c.default_tax_rate}%
                </p>
              </button>
            );
          })}
        </div>

        <div>
          <Label>Reason (logged for audit)</Label>
          <Textarea
            placeholder="e.g. Going live in Nigeria — switching to NGN with Paystack."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5 min-h-[80px]"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-warning-foreground">
            <strong>Warning:</strong> Switching country changes currency, tax rules, payment gateway, and invoice formatting platform-wide.
            Existing orders keep their original currency. Only switch when launching a new deployment region.
          </p>
        </div>

        <Button onClick={handleSwitch} disabled={busy || loading || target === settings?.active_country_code}>
          {busy ? "Switching..." : `Switch to ${target}`}
        </Button>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Power className="h-4 w-4" /> Platform Modules
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">Odoo ERP Sync</p>
              <p className="text-xs text-muted-foreground">Push orders to Odoo, pull shipments back</p>
            </div>
            <Switch
              checked={settings?.odoo_enabled ?? false}
              onCheckedChange={(v) => toggleFlag("odoo_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">Dropshipping Mode</p>
              <p className="text-xs text-muted-foreground">Vendors can fulfill via 3rd-party suppliers</p>
            </div>
            <Switch
              checked={settings?.dropshipping_enabled ?? false}
              onCheckedChange={(v) => toggleFlag("dropshipping_enabled", v)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
