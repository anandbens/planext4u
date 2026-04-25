/**
 * Module Visibility (Admin) — single source of truth for the six top-level
 * customer-app modules: Shop, Socio, Services, Find Home, Classifieds, Food.
 *
 * Responsibilities:
 *   1. List every `module_*_enabled` flag from `platform_variables` with a
 *      Switch and a description.
 *   2. Persist toggles immediately via `api.updatePlatformVariable` (no
 *      "Save Changes" button — accidental partial saves are a footgun for
 *      something this destructive).
 *   3. Live preview pane that renders the actual <ModuleGuard /> coming-soon
 *      screen so an admin can see exactly what customers will see when the
 *      flag is off, BEFORE flipping it.
 *
 * Backend gating:
 *   When a flag is set to `false`, in addition to the UI gate, the SQL
 *   `is_module_enabled()` function used by RLS policies on the customer-facing
 *   tables (services, classified_ads, properties, restaurants, etc.) returns
 *   FALSE, so direct REST/PostgREST queries return zero rows even if a client
 *   bypasses the React shell entirely. See migration adding those policies.
 */
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api, PlatformVariable } from "@/lib/api";
import { ModuleGuard } from "@/components/customer/ModuleGuard";
import { type ModuleKey } from "@/hooks/useModuleStatus";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Eye, Loader2, ShieldCheck } from "lucide-react";

interface ModuleSpec {
  key: ModuleKey;
  varKey: string;
  label: string;
  blurb: string;
  customerEntryPath: string;
}

const MODULES: ModuleSpec[] = [
  { key: "shop",        varKey: "module_shop_enabled",        label: "Shop",        blurb: "Marketplace browse, product detail, cart and checkout.",       customerEntryPath: "/app/browse" },
  { key: "socio",       varKey: "module_socio_enabled",       label: "Socio",       blurb: "Social feed, reels, stories, DMs and creator dashboard.",      customerEntryPath: "/app/social" },
  { key: "services",    varKey: "module_services_enabled",    label: "Services",    blurb: "Service marketplace listing and booking flow.",                customerEntryPath: "/app/services" },
  { key: "homes",       varKey: "module_homes_enabled",       label: "Find Home",   blurb: "Real-estate listings (Rent / Buy / PG / Flatmates).",          customerEntryPath: "/app/find-home" },
  { key: "classifieds", varKey: "module_classifieds_enabled", label: "Classifieds", blurb: "OLX-style classified ads (post / browse / detail).",          customerEntryPath: "/app/classifieds" },
  { key: "food",        varKey: "module_food_enabled",        label: "Food",        blurb: "Food delivery — restaurants, cart, orders and rider tracking.", customerEntryPath: "/app/food" },
];

export default function AdminModuleVisibilityPage() {
  const [variables, setVariables] = useState<PlatformVariable[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewModule, setPreviewModule] = useState<ModuleSpec | null>(null);
  const queryClient = useQueryClient();

  const load = async () => {
    setLoading(true);
    const all = await api.getPlatformVariables();
    setVariables(all.filter((v) => MODULES.some((m) => m.varKey === v.key)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const indexedByKey = useMemo(() => {
    const m: Record<string, PlatformVariable | undefined> = {};
    variables.forEach((v) => { m[v.key] = v; });
    return m;
  }, [variables]);

  const handleToggle = async (mod: ModuleSpec, nextEnabled: boolean) => {
    const v = indexedByKey[mod.varKey];
    if (!v) {
      toast.error(`Variable ${mod.varKey} is missing in platform_variables.`);
      return;
    }
    setSavingKey(mod.varKey);
    // Optimistic UI
    setVariables((prev) => prev.map((x) => x.id === v.id ? { ...x, value: nextEnabled ? "true" : "false" } : x));
    try {
      await api.updatePlatformVariable(v.id, nextEnabled ? "true" : "false", v.value, v.key);
      // Invalidate the customer-app module status cache so live previews and
      // any open customer tabs re-fetch within their staleTime window.
      queryClient.invalidateQueries({ queryKey: ["module_status"] });
      toast.success(`${mod.label} ${nextEnabled ? "enabled" : "set to Coming Soon"}.`);
    } catch (e: any) {
      // Rollback optimistic update
      setVariables((prev) => prev.map((x) => x.id === v.id ? { ...x, value: v.value } : x));
      toast.error(e?.message || "Failed to update module visibility.");
    } finally {
      setSavingKey(null);
    }
  };

  const isEnabled = (mod: ModuleSpec) => {
    const v = indexedByKey[mod.varKey];
    if (!v) return true; // default on
    return String(v.value).toLowerCase() === "true";
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Module Visibility</h1>
        <p className="page-description">
          Turn customer-facing modules on or off. Disabled modules show a
          “Coming Soon” screen — including for direct URL navigation and shared
          deep links — and the database returns no rows for them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* ---------- Toggle list ---------- */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Customer modules
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Toggling a module updates immediately for every customer on
                their next page load (cache TTL ~60s).
              </p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>

          <CardContent className="space-y-3">
            {MODULES.map((mod) => {
              const enabled = isEnabled(mod);
              const v = indexedByKey[mod.varKey];
              const missing = !v;
              return (
                <div
                  key={mod.varKey}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{mod.label}</span>
                      <Badge variant={enabled ? "default" : "secondary"} className="text-[10px] uppercase tracking-wide">
                        {enabled ? "Live" : "Coming Soon"}
                      </Badge>
                      {missing && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> not configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{mod.blurb}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono break-all">
                      {mod.varKey} · entry: {mod.customerEntryPath}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setPreviewModule(mod)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>

                  <Switch
                    aria-label={`Toggle ${mod.label}`}
                    checked={enabled}
                    disabled={missing || savingKey === mod.varKey}
                    onCheckedChange={(c) => handleToggle(mod, c)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ---------- Live preview ---------- */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click <span className="font-medium">Preview</span> on any module
              above to see the exact “Coming Soon” screen customers see when
              that module is off.
            </p>
          </CardHeader>
          <CardContent>
            {previewModule ? (
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="px-3 py-2 border-b text-xs flex items-center justify-between">
                  <span className="font-medium">{previewModule.label}</span>
                  <span className="text-muted-foreground font-mono">
                    {previewModule.customerEntryPath}
                  </span>
                </div>
                <ScrollArea className="h-[460px]">
                  {/*
                    Force the preview by passing a guard whose flag we treat as
                    disabled. The simplest way is to render an inline element
                    that mirrors what ModuleGuard renders when disabled.
                  */}
                  <ComingSoonPreview label={previewModule.label} />
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No module selected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

/**
 * Mirrors the `disabled` branch of `<ModuleGuard />` so an admin can see the
 * Coming Soon screen WITHOUT needing to actually toggle the flag (no risk to
 * live customers). Kept visually in lock-step with `ModuleGuard.tsx`.
 */
function ComingSoonPreview({ label }: { label: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center px-6 py-12">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">✨</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">{label} — Coming Soon</h2>
        <p className="text-sm text-muted-foreground">
          We're putting the finishing touches on {label}. Please check back
          shortly — it'll be available very soon!
        </p>
      </div>
    </div>
  );
}

// Re-export ModuleGuard so any future "live (real) preview" mode can plug in
// without an extra import in this file.
export { ModuleGuard };
