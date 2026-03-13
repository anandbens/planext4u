import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, PlatformVariable } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PlatformVariablesPage() {
  const [variables, setVariables] = useState<PlatformVariable[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getPlatformVariables().then((vars) => {
      setVariables(vars);
      const vals: Record<string, string> = {};
      vars.forEach((v) => { vals[v.id] = v.value; });
      setEditValues(vals);
    });
  }, []);

  const handleSave = async () => {
    for (const v of variables) {
      if (editValues[v.id] !== v.value) {
        await api.updatePlatformVariable(v.id, editValues[v.id]);
      }
    }
    toast.success("Platform variables saved");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Platform Variables</h1>
        <p className="page-description">Configure system-wide settings and parameters</p>
      </div>
      <div className="bg-card rounded-xl border border-border/50 p-6 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {variables.map((v) => (
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
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </AdminLayout>
  );
}
