/**
 * Admin Layout Builder
 *
 * Drag-and-drop homepage layout editor scoped per module
 * (ecommerce / food / homes / socio). Admins can:
 *   • Reorder sections via drag handle
 *   • Toggle visibility
 *   • Add new widgets from the registry
 *   • Edit per-widget title and config (text/number/url/select fields)
 *   • Delete sections
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { listWidgetsForModule, getWidget, WidgetModule } from "@/components/homepage/widget-registry";
import "@/components/homepage/widgets"; // register
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MODULES: { value: WidgetModule; label: string }[] = [
  { value: "ecommerce", label: "Ecommerce" },
  { value: "food", label: "Food" },
  { value: "homes", label: "Homes" },
  { value: "socio", label: "Socio" },
];

function SortableSectionRow({
  section, onEdit, onToggle, onDelete,
}: { section: any; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const spec = getWidget(section.widget_type);
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="p-3 flex items-center gap-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{section.title || spec?.label || section.widget_type}</p>
          {!section.is_visible && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {spec?.label || "Unknown widget"} · <span className="font-mono">{section.widget_type}</span>
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onToggle} title={section.is_visible ? "Hide" : "Show"}>
        {section.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </Card>
  );
}

function EditSectionModal({
  open, onClose, section, onSave,
}: { open: boolean; onClose: () => void; section: any; onSave: (s: any) => Promise<void> }) {
  const [form, setForm] = useState<any>(section);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(section); setError(null); }, [section?.id]);
  const spec = section ? getWidget(section.widget_type) : undefined;
  if (!section) return null;

  const updateConfig = (k: string, v: any) => setForm({ ...form, config: { ...(form.config || {}), [k]: v } });

  const handleSave = async () => {
    setError(null);
    const title = String(form.title || "").trim();
    if (title.length > 80) { setError("Title must be 80 characters or fewer."); return; }
    if (spec?.validate) {
      const msg = spec.validate({ title, config: form.config || {} });
      if (msg) { setError(msg); return; }
    }
    try {
      setSaving(true);
      await onSave({ ...form, title });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Edit section</DialogTitle>
        <div className="space-y-3 mt-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          {spec?.fields?.map((f) => {
            const v = form.config?.[f.key] ?? "";
            if (f.type === "select") {
              return (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Select value={String(v || f.options[0]?.value)} onValueChange={(val) => updateConfig(f.key, val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            return (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={v}
                  min={f.type === "number" ? 1 : undefined}
                  onChange={(e) => updateConfig(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                />
              </div>
            );
          })}
          {error && (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWidgetModal({
  open, onClose, module, onAdd,
}: { open: boolean; onClose: () => void; module: WidgetModule; onAdd: (type: string) => Promise<void> }) {
  const widgets = listWidgetsForModule(module);
  const groups = useMemo(() => {
    const g: Record<string, typeof widgets> = {};
    widgets.forEach((w) => { (g[w.group] ||= []).push(w); });
    return g;
  }, [widgets]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogTitle>Add widget</DialogTitle>
        <div className="space-y-4 mt-3">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{group}</p>
              <div className="grid gap-2">
                {list.map((w) => (
                  <button
                    key={w.type}
                    onClick={async () => { await onAdd(w.type); onClose(); }}
                    className="text-left p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-accent/30 transition-colors"
                  >
                    <p className="text-sm font-semibold">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModulePanel({ module }: { module: WidgetModule }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: layout } = useQuery({
    queryKey: ["admin_layout", module],
    queryFn: async () => {
      let l: any = (await supabase.from("homepage_layouts" as any)
        .select("*").eq("module", module).eq("name", "default").maybeSingle()).data;
      if (!l) {
        const ins = await supabase.from("homepage_layouts" as any).insert({ module, name: "default", is_active: true } as any).select("*").maybeSingle();
        l = ins.data;
      }
      const { data: secs } = await supabase.from("homepage_layout_sections" as any)
        .select("*").eq("layout_id", l.id).order("display_order");
      return { layout: l, sections: (secs || []) as any[] };
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!layout) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = layout.sections.findIndex((s) => s.id === active.id);
    const newIdx = layout.sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(layout.sections, oldIdx, newIdx);
    qc.setQueryData(["admin_layout", module], { ...layout, sections: reordered });
    // persist new display_order in batch
    await Promise.all(reordered.map((s, i) =>
      supabase.from("homepage_layout_sections" as any).update({ display_order: (i + 1) * 10 }).eq("id", s.id),
    ));
    qc.invalidateQueries({ queryKey: ["admin_layout", module] });
  };

  const toggle = async (s: any) => {
    await supabase.from("homepage_layout_sections" as any).update({ is_visible: !s.is_visible }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin_layout", module] });
  };

  const remove = async (s: any) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("homepage_layout_sections" as any).delete().eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin_layout", module] });
    toast.success("Section deleted");
  };

  const save = async (s: any) => {
    const spec = getWidget(s.widget_type);
    const title = String(s.title || "").trim();
    if (title.length > 80) throw new Error("Title must be 80 characters or fewer.");
    if (spec?.validate) {
      const msg = spec.validate({ title, config: s.config || {} });
      if (msg) throw new Error(msg);
    }
    const { error } = await supabase.from("homepage_layout_sections" as any).update({
      title, config: s.config || {},
    }).eq("id", s.id);
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["admin_layout", module] });
    toast.success("Saved");
  };

  const add = async (widget_type: string) => {
    if (!layout) return;
    const spec = getWidget(widget_type);
    const max = layout.sections.reduce((m, s) => Math.max(m, s.display_order || 0), 0);
    const { data: inserted, error } = await supabase.from("homepage_layout_sections" as any).insert({
      layout_id: layout.layout.id,
      widget_type,
      title: spec?.label || widget_type,
      display_order: max + 10,
      is_visible: spec?.requiresConfig ? false : true,
      config: {},
    } as any).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin_layout", module] });
    if (spec?.requiresConfig && inserted) {
      toast.message("Configure this widget before publishing", { description: "It's hidden until you save valid settings." });
      setEditing(inserted as any);
    } else {
      toast.success("Widget added");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Drag to reorder. Click pencil to edit settings.</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add widget</Button>
      </div>

      {!layout ? <p className="text-sm text-muted-foreground">Loading…</p> : layout.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
          No widgets yet — click <strong>Add widget</strong> to start.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={layout.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {layout.sections.map((s) => (
                <SortableSectionRow key={s.id} section={s}
                  onEdit={() => setEditing(s)}
                  onToggle={() => toggle(s)}
                  onDelete={() => remove(s)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <EditSectionModal open={!!editing} onClose={() => setEditing(null)} section={editing} onSave={save} />
      <AddWidgetModal open={addOpen} onClose={() => setAddOpen(false)} module={module} onAdd={add} />
    </div>
  );
}

export default function AdminLayoutBuilderPage() {
  const [tab, setTab] = useState<WidgetModule>("ecommerce");
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Homepage Layout Builder</h1>
        <p className="page-description">Drag-and-drop widgets to design each module's homepage. Changes go live instantly.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as WidgetModule)}>
        <TabsList>
          {MODULES.map((m) => <TabsTrigger key={m.value} value={m.value}>{m.label}</TabsTrigger>)}
        </TabsList>
        {MODULES.map((m) => (
          <TabsContent key={m.value} value={m.value} className="mt-4">
            <ModulePanel module={m.value} />
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}
