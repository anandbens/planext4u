import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, PlatformVariable } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const POINTS_KEYS = [
  'WELCOME_BONUS', 'welcome_points', 'referral_points', 'vendor_referral_points',
  'post_like_points', 'post_share_points', 'story_liked_points',
  'order_reward_rate', 'max_points_per_order',
  'points_expiry_days', 'expiry_reminder_days',
  'referral_cooling_enabled',
];

const CALL_KEYS = ['voice_call_enabled', 'video_call_enabled'];

const MODULE_KEYS = [
  'module_shop_enabled',
  'module_socio_enabled',
  'module_services_enabled',
  'module_homes_enabled',
  'module_classifieds_enabled',
  'module_food_enabled',
];

const MODULE_LABELS: Record<string, string> = {
  module_shop_enabled: 'Shop',
  module_socio_enabled: 'Socio',
  module_services_enabled: 'Services',
  module_homes_enabled: 'Find Home',
  module_classifieds_enabled: 'Classifieds',
  module_food_enabled: 'Food',
};

const isBooleanKey = (k: string) =>
  MODULE_KEYS.includes(k) || CALL_KEYS.includes(k) || k === 'referral_cooling_enabled';

export default function PlatformVariablesPage() {
  const [variables, setVariables] = useState<PlatformVariable[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadVars = () => {
    api.getPlatformVariables().then((vars) => {
      setVariables(vars);
      const vals: Record<string, string> = {};
      vars.forEach((v) => { vals[v.id] = v.value; });
      setEditValues(vals);
    });
  };

  useEffect(() => { loadVars(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let changed = 0;
      for (const v of variables) {
        if (editValues[v.id] !== v.value) {
          await api.updatePlatformVariable(v.id, editValues[v.id], v.value, v.key);
          changed++;
        }
      }
      loadVars(); // Re-fetch to confirm persistence
      toast.success(changed > 0 ? `${changed} variable(s) updated successfully` : "No changes to save");
    } catch (e) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const moduleVars = MODULE_KEYS
    .map(k => variables.find(v => v.key === k))
    .filter((v): v is PlatformVariable => !!v);
  const pointsVars = variables.filter(v => POINTS_KEYS.includes(v.key));
  const callVars = variables.filter(v => CALL_KEYS.includes(v.key));
  const otherVars = variables.filter(v =>
    !POINTS_KEYS.includes(v.key) &&
    !CALL_KEYS.includes(v.key) &&
    !MODULE_KEYS.includes(v.key)
  );

  const renderRow = (v: PlatformVariable, labelOverride?: string) => {
    const isBool = isBooleanKey(v.key);
    const currentVal = editValues[v.id] ?? v.value;
    return (
      <div key={v.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
        <div className="flex-1">
          <Label className="text-sm font-medium">{labelOverride || v.key}</Label>
          <p className="text-xs text-muted-foreground">{v.description}</p>
        </div>
        {isBool ? (
          <Switch
            checked={String(currentVal).toLowerCase() === 'true'}
            onCheckedChange={(c) => setEditValues((prev) => ({ ...prev, [v.id]: c ? 'true' : 'false' }))}
          />
        ) : (
          <Input
            value={currentVal || ""}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [v.id]: e.target.value }))}
            className="w-32 h-9 bg-card"
          />
        )}
      </div>
    );
  };

  const renderGroup = (title: string, vars: PlatformVariable[], labelMap?: Record<string, string>) => (
    vars.length > 0 && (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        {vars.map((v) => renderRow(v, labelMap?.[v.key]))}
      </div>
    )
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Platform Variables</h1>
        <p className="page-description">Configure system-wide settings and parameters</p>
      </div>
      <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {renderGroup("Module Visibility (toggle 'Coming Soon')", moduleVars, MODULE_LABELS)}
        {renderGroup("Points & Rewards", pointsVars)}
        {renderGroup("Voice & Video Calls (Socio DMs)", callVars)}
        {renderGroup("Other Settings", otherVars)}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </AdminLayout>
  );
}
