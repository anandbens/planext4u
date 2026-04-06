import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, X } from "lucide-react";

export default function AdminProductAttributesPage() {
  const qc = useQueryClient();
  const [attrModal, setAttrModal] = useState(false);
  const [editAttr, setEditAttr] = useState<any>(null);
  const [attrForm, setAttrForm] = useState({ name: "", attribute_type: "select", is_active: true });
  const [valInput, setValInput] = useState("");
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);
  const [newValInput, setNewValInput] = useState("");

  const { data: attributes } = useQuery({
    queryKey: ["productAttributes"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attributes" as any).select("*").order("sort_order");
      return (data || []) as any[];
    },
  });

  const { data: allValues } = useQuery({
    queryKey: ["productAttributeValues"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attribute_values" as any).select("*").order("sort_order");
      return (data || []) as any[];
    },
  });

  const saveAttr = async () => {
    if (!attrForm.name.trim()) return;
    if (editAttr) {
      await supabase.from("product_attributes" as any).update({ name: attrForm.name, attribute_type: attrForm.attribute_type, is_active: attrForm.is_active } as any).eq("id", editAttr.id);
      toast.success("Attribute updated");
    } else {
      const maxOrder = attributes?.length ? Math.max(...attributes.map((a: any) => a.sort_order || 0)) + 1 : 0;
      await supabase.from("product_attributes" as any).insert({ name: attrForm.name, attribute_type: attrForm.attribute_type, is_active: attrForm.is_active, sort_order: maxOrder } as any);
      toast.success("Attribute created");
    }
    qc.invalidateQueries({ queryKey: ["productAttributes"] });
    setAttrModal(false);
    setEditAttr(null);
    setAttrForm({ name: "", attribute_type: "select", is_active: true });
  };

  const deleteAttr = async (id: string) => {
    if (!confirm("Delete this attribute and all its values?")) return;
    await supabase.from("product_attributes" as any).delete().eq("id", id);
    toast.success("Attribute deleted");
    qc.invalidateQueries({ queryKey: ["productAttributes"] });
    qc.invalidateQueries({ queryKey: ["productAttributeValues"] });
  };

  const addValue = async (attrId: string) => {
    if (!newValInput.trim()) return;
    const vals = (allValues || []).filter((v: any) => v.attribute_id === attrId);
    await supabase.from("product_attribute_values" as any).insert({ attribute_id: attrId, value: newValInput.trim(), sort_order: vals.length } as any);
    setNewValInput("");
    toast.success("Value added");
    qc.invalidateQueries({ queryKey: ["productAttributeValues"] });
  };

  const deleteValue = async (id: string) => {
    await supabase.from("product_attribute_values" as any).delete().eq("id", id);
    toast.success("Value removed");
    qc.invalidateQueries({ queryKey: ["productAttributeValues"] });
  };

  return (
    <AdminLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Product Attributes</h1>
          <p className="page-description">Manage product attributes like Color, Size, Weight etc.</p>
        </div>
        <Button onClick={() => { setEditAttr(null); setAttrForm({ name: "", attribute_type: "select", is_active: true }); setAttrModal(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Attribute
        </Button>
      </div>

      <div className="grid gap-3 mt-4">
        {(attributes || []).map((attr: any) => {
          const vals = (allValues || []).filter((v: any) => v.attribute_id === attr.id);
          const isExpanded = expandedAttr === attr.id;
          return (
            <Card key={attr.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedAttr(isExpanded ? null : attr.id)}>
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">{attr.name}</h3>
                    <p className="text-xs text-muted-foreground">{attr.attribute_type} • {vals.length} values</p>
                  </div>
                  <Badge variant={attr.is_active ? "default" : "secondary"} className="text-[10px]">{attr.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditAttr(attr); setAttrForm({ name: attr.name, attribute_type: attr.attribute_type, is_active: attr.is_active }); setAttrModal(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAttr(attr.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {vals.map((v: any) => (
                      <Badge key={v.id} variant="outline" className="gap-1 pr-1">
                        {v.value}
                        <button onClick={() => deleteValue(v.id)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  {attr.attribute_type === "select" && (
                    <div className="flex gap-2">
                      <Input value={newValInput} onChange={(e) => setNewValInput(e.target.value)} placeholder="Add new value..." className="max-w-xs h-8 text-xs"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(attr.id); } }} />
                      <Button size="sm" className="h-8" onClick={() => addValue(attr.id)}>Add</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={attrModal} onOpenChange={setAttrModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{editAttr ? "Edit Attribute" : "New Attribute"}</DialogTitle>
          <div className="space-y-4 pt-2">
            <div><Label>Name</Label><Input value={attrForm.name} onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })} placeholder="e.g. Color, Size" /></div>
            <div><Label>Type</Label>
              <Select value={attrForm.attribute_type} onValueChange={(v) => setAttrForm({ ...attrForm, attribute_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select (Dropdown)</SelectItem>
                  <SelectItem value="text">Text (Free input)</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={attrForm.is_active} onCheckedChange={(v) => setAttrForm({ ...attrForm, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={saveAttr}>{editAttr ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
