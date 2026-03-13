import { Vendor } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Store, Percent, Crown, ArrowRight } from "lucide-react";
import { useState } from "react";

interface VendorModalProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
}

const statusFlow: Vendor["status"][] = ["pending", "level1_approved", "level2_approved", "verified"];

export function VendorModal({ vendor, open, onOpenChange, mode }: VendorModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");

  if (!vendor) return null;

  const currentStep = statusFlow.indexOf(vendor.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-info flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{vendor.business_name}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{vendor.name} · {vendor.id}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <StatusBadge status={vendor.status} />
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vendor.membership === 'premium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
              {vendor.membership}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Approval Progress */}
        {vendor.status !== "rejected" && (
          <div className="flex items-center gap-1 py-3">
            {statusFlow.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentStep ? 'gradient-primary' : 'bg-secondary'}`} />
                {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="details" className="mt-1">
          <TabsList className="bg-secondary/50 w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Owner Name</Label>
                {editMode ? <Input defaultValue={vendor.name} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Business Name</Label>
                {editMode ? <Input defaultValue={vendor.business_name} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.business_name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                {editMode ? <Input defaultValue={vendor.email} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.email}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                {editMode ? <Input defaultValue={vendor.mobile} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.mobile}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editMode ? (
                  <Select defaultValue={vendor.status}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusFlow.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <div className="mt-1"><StatusBadge status={vendor.status} /></div>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="business" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-primary" />
                  <Label className="text-xs text-muted-foreground">Commission Rate</Label>
                </div>
                {editMode ? <Input type="number" defaultValue={vendor.commission_rate} className="mt-1" /> : <p className="text-xl font-bold">{vendor.commission_rate}%</p>}
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-warning" />
                  <Label className="text-xs text-muted-foreground">Membership</Label>
                </div>
                {editMode ? (
                  <Select defaultValue={vendor.membership}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-xl font-bold capitalize">{vendor.membership}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category ID</Label>
                <p className="text-sm font-medium mt-1">{vendor.category_id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City / Area</Label>
                <p className="text-sm font-medium mt-1">{vendor.city_id} / {vendor.area_id}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
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
