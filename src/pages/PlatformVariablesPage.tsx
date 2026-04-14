import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, PlatformVariable } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const POINTS_KEYS = [
  'welcome_points', 'referral_points', 'vendor_referral_points',
  'post_like_points', 'post_share_points', 'story_liked_points',
  'order_reward_rate', 'max_points_per_order',
  'points_expiry_days', 'expiry_reminder_days',
  'referral_cooling_enabled',
];

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

  const pointsVars = variables.filter(v => POINTS_KEYS.includes(v.key));
  const otherVars = variables.filter(v => !POINTS_KEYS.includes(v.key));

  const renderGroup = (title: string, vars: PlatformVariable[]) => (
    vars.length > 0 && (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        {vars.map((v) => (
          <div key={v.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
            <div className="flex-1">
              <Label className="text-sm font-medium">{v.key}</Label>
              <p className="text-xs text-muted-foreground">{v.description}</p>
            </div>
            <Input
              value={editValues[v.id] || ""}
              onChange={(e) => setEditValues((prev) => ({ ...prev, [v.id]: e.target.value }))}
              className="w-32 h-9 bg-card"
            />
          </div>
        ))}
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
        {renderGroup("Points & Rewards", pointsVars)}
        {renderGroup("Other Settings", otherVars)}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </AdminLayout>
  );
}
