import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_OPTIONS = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM",
];

interface TimeSlot { start: string; end: string; }
interface DayAvailability { day_of_week: number; is_available: boolean; time_slots: TimeSlot[]; }

function getDefaultAvailability(): DayAvailability[] {
  return DAYS.map((_, i) => ({
    day_of_week: i,
    is_available: i >= 1 && i <= 6, // Mon-Sat default
    time_slots: i >= 1 && i <= 6 ? [{ start: "09:00 AM", end: "06:00 PM" }] : [],
  }));
}

export default function VendorAvailabilityPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [schedule, setSchedule] = useState<DayAvailability[]>(getDefaultAvailability());
  const [hasChanges, setHasChanges] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["vendorAvailability", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_availability" as any)
        .select("*")
        .eq("vendor_id", vendorId)
        .order("day_of_week");
      if (data && data.length > 0) {
        const merged = getDefaultAvailability().map((def) => {
          const found = (data as any[]).find((d: any) => d.day_of_week === def.day_of_week);
          if (found) {
            return {
              day_of_week: found.day_of_week,
              is_available: found.is_available,
              time_slots: (found.time_slots as TimeSlot[]) || [],
            };
          }
          return def;
        });
        setSchedule(merged);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing and reinsert
      await supabase.from("vendor_availability" as any).delete().eq("vendor_id", vendorId);
      const rows = schedule.map((d) => ({
        vendor_id: vendorId,
        day_of_week: d.day_of_week,
        is_available: d.is_available,
        time_slots: d.time_slots,
      }));
      const { error } = await supabase.from("vendor_availability" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorAvailability"] });
      setHasChanges(false);
      toast.success("Availability saved successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDay = (dayIndex: number, updates: Partial<DayAvailability>) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayIndex ? { ...d, ...updates } : d))
    );
    setHasChanges(true);
  };

  const addSlot = (dayIndex: number) => {
    const day = schedule.find((d) => d.day_of_week === dayIndex);
    if (!day) return;
    updateDay(dayIndex, { time_slots: [...day.time_slots, { start: "09:00 AM", end: "05:00 PM" }] });
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const day = schedule.find((d) => d.day_of_week === dayIndex);
    if (!day) return;
    updateDay(dayIndex, { time_slots: day.time_slots.filter((_, i) => i !== slotIndex) });
  };

  const updateSlot = (dayIndex: number, slotIndex: number, field: "start" | "end", value: string) => {
    const day = schedule.find((d) => d.day_of_week === dayIndex);
    if (!day) return;
    const newSlots = day.time_slots.map((s, i) => (i === slotIndex ? { ...s, [field]: value } : s));
    updateDay(dayIndex, { time_slots: newSlots });
  };

  return (
    <VendorLayout title="Availability">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Set Your Weekly Schedule</h2>
            <p className="text-sm text-muted-foreground">Customers can only book when you're available</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-3">
            {schedule.map((day) => (
              <Card key={day.day_of_week} className={`p-4 transition-colors ${!day.is_available ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={day.is_available}
                      onCheckedChange={(checked) => updateDay(day.day_of_week, { is_available: checked })}
                    />
                    <Label className="text-sm font-medium">{DAYS[day.day_of_week]}</Label>
                  </div>
                  {day.is_available && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => addSlot(day.day_of_week)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Slot
                    </Button>
                  )}
                </div>

                {day.is_available && (
                  <div className="space-y-2 ml-12">
                    {day.time_slots.length === 0 && (
                      <p className="text-xs text-muted-foreground">No time slots set. Add a slot to accept bookings.</p>
                    )}
                    {day.time_slots.map((slot, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Select value={slot.start} onValueChange={(v) => updateSlot(day.day_of_week, si, "start", v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <Select value={slot.end} onValueChange={(v) => updateSlot(day.day_of_week, si, "end", v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSlot(day.day_of_week, si)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!day.is_available && (
                  <p className="text-xs text-muted-foreground ml-12">Not available</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
