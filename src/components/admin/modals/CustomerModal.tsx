import { User } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Mail, Phone, Star, Gift, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

interface CustomerModalProps {
  customer: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (id: string, data: Partial<User>) => Promise<void>;
}

export function CustomerModal({ customer, open, onOpenChange, mode, onSave }: CustomerModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", status: "" as User["status"] });

  useEffect(() => {
    if (customer) {
      setForm({ name: customer.name, email: customer.email, mobile: customer.mobile, status: customer.status });
      setEditMode(mode === "edit");
    }
  }, [customer, mode]);

  if (!customer) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(customer.id, form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-card">{customer.name.charAt(0)}</span>
            </div>
            <div>
              <span>{customer.name}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{customer.id}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <StatusBadge status={customer.status} />
            <span className="text-xs text-muted-foreground">
              Joined {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="bg-secondary/50 w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="wallet">Wallet & Referrals</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                {editMode ? (
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
                ) : (
                  <p className="text-sm font-medium mt-1">{customer.name}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editMode ? (
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1"><StatusBadge status={customer.status} /></div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                {editMode ? (
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                ) : (
                  <p className="text-sm font-medium mt-1">{customer.email}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                {editMode ? (
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" />
                ) : (
                  <p className="text-sm font-medium mt-1">{customer.mobile}</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Star className="h-5 w-5 mx-auto text-warning mb-1" />
                <p className="text-2xl font-bold">{customer.wallet_points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Wallet Points</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Gift className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono mt-1">{customer.referral_code}</p>
                <p className="text-xs text-muted-foreground">Referral Code</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <Calendar className="h-5 w-5 mx-auto text-info mb-1" />
                <p className="text-sm font-bold mt-1">{new Date(customer.created_at).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            </div>
            {customer.referred_by && (
              <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-primary/10">
                <p className="text-xs text-muted-foreground">Referred By</p>
                <p className="text-sm font-medium">{customer.referred_by}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="location" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">City ID</Label>
                <p className="text-sm font-medium mt-1">{customer.city_id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Area ID</Label>
                <p className="text-sm font-medium mt-1">{customer.area_id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Coordinates</Label>
                <p className="text-sm font-medium mt-1">{customer.latitude}, {customer.longitude}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setEditMode(true)}>Edit</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
