import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Save, CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeSlot { start: string; end: string }
interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  buffer_minutes: number;
  time_slots: TimeSlot[];
}

const defaultSchedule = (): DayAvailability[] =>
  DAYS.map((_, i) => ({
    day_of_week: i,
    is_available: i >= 1 && i <= 6,
    start_time: "09:00",
    end_time: "18:00",
    buffer_minutes: 30,
    time_slots: [],
  }));

const fmt12 = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

export default function VendorAvailabilityPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [schedule, setSchedule] = useState<DayAvailability[]>(defaultSchedule());
  const [hasChanges, setHasChanges] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [overrideDate, setOverrideDate] = useState(today);
  const [overrideReason, setOverrideReason] = useState("");

  const { isLoading } = useQuery({
    queryKey: ["vendorAvailability", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_availability" as any)
        .select("*")
        .eq("vendor_id", vendorId)
        .order("day_of_week");
      if (data && data.length > 0) {
        const merged = defaultSchedule().map((def) => {
          const f = (data as any[]).find((d: any) => d.day_of_week === def.day_of_week);
          return f
            ? {
                day_of_week: f.day_of_week,
                is_available: f.is_available,
                start_time: (f.start_time || "09:00:00").slice(0, 5),
                end_time: (f.end_time || "18:00:00").slice(0, 5),
                buffer_minutes: f.buffer_minutes ?? 30,
                time_slots: Array.isArray(f.time_slots) ? f.time_slots : [],
              }
            : def;
        });
        setSchedule(merged);
      }
      return data;
    },
  });

  const { data: overrides } = useQuery({
    queryKey: ["vendorOverrides", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_date_overrides" as any)
        .select("*")
        .eq("vendor_id", vendorId)
        .gte("override_date", today)
        .order("override_date");
      return (data || []) as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vendorId || vendorId === "VND-001") throw new Error("Vendor not authenticated");
      const rows = schedule.map((d) => ({
        vendor_id: vendorId,
        day_of_week: d.day_of_week,
        is_available: d.is_available,
        start_time: d.start_time,
        end_time: d.end_time,
        buffer_minutes: Math.max(15, d.buffer_minutes || 30),
        time_slots: [],
      }));
      const { error } = await supabase
        .from("vendor_availability" as any)
        .upsert(rows as any, { onConflict: "vendor_id,day_of_week" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorAvailability"] });
      setHasChanges(false);
      toast.success("Weekly schedule saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const overrideMutation = useMutation({
    mutationFn: async (vars: { date: string; available: boolean; reason?: string }) => {
      const { error } = await supabase.from("vendor_date_overrides" as any).upsert(
        {
          vendor_id: vendorId,
          override_date: vars.date,
          is_available: vars.available,
          reason: vars.reason || null,
        } as any,
        { onConflict: "vendor_id,override_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorOverrides"] });
      toast.success("Date override saved");
      setOverrideReason("");
    },
    onError: (e: any) => toast.error(e.message || "Failed — existing bookings may exist"),
  });

  const removeOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_date_overrides" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorOverrides"] });
      toast.success("Override removed");
    },
  });

  const updateDay = (i: number, patch: Partial<DayAvailability>) => {
    setSchedule((prev) => prev.map((d) => (d.day_of_week === i ? { ...d, ...patch } : d)));
    setHasChanges(true);
  };

  const todayOverride = (overrides || []).find((o) => o.override_date === today);

  return (
    <VendorLayout title="Availability">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Today status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarOff className="h-4 w-4 text-primary" /> Today's Status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Quick on/off for today only. Existing bookings block turning off.</p>
            </div>
            <Switch
              checked={!todayOverride || todayOverride.is_available}
              onCheckedChange={(checked) => {
                if (checked && todayOverride) {
                  removeOverride.mutate(todayOverride.id);
                } else if (!checked) {
                  overrideMutation.mutate({ date: today, available: false, reason: "Off today" });
                }
              }}
            />
          </div>
        </Card>

        {/* Weekly schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Weekly Schedule</h2>
              <p className="text-sm text-muted-foreground">Set working hours and travel buffer per day</p>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {schedule.map((day) => (
                <Card key={day.day_of_week} className={`p-3 ${!day.is_available ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Switch
                      checked={day.is_available}
                      onCheckedChange={(c) => updateDay(day.day_of_week, { is_available: c })}
                    />
                    <Label className="text-sm font-medium w-20">{DAYS[day.day_of_week]}</Label>
                    {day.is_available && (
                      <>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <Input type="time" value={day.start_time} onChange={(e) => updateDay(day.day_of_week, { start_time: e.target.value })} className="h-8 w-[110px] text-xs" />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input type="time" value={day.end_time} onChange={(e) => updateDay(day.day_of_week, { end_time: e.target.value })} className="h-8 w-[110px] text-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">Buffer</Label>
                          <Input type="number" min={15} step={5} value={day.buffer_minutes} onChange={(e) => updateDay(day.day_of_week, { buffer_minutes: Math.max(15, Number(e.target.value) || 15) })} className="h-8 w-[70px] text-xs" />
                          <span className="text-xs text-muted-foreground">min</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Date overrides */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CalendarOff className="h-4 w-4 text-primary" /> Holidays & Date-Specific Off</h3>
          <p className="text-xs text-muted-foreground mb-3">Mark specific upcoming dates as unavailable. Cannot mark off if active bookings exist on that date.</p>
          <div className="flex items-end gap-2 flex-wrap mb-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" min={today} value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Holiday, leave, etc." className="h-9 text-xs" />
            </div>
            <Button size="sm" onClick={() => overrideMutation.mutate({ date: overrideDate, available: false, reason: overrideReason })} disabled={overrideMutation.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Mark Off
            </Button>
          </div>
          <div className="space-y-2">
            {(overrides || []).filter((o) => o.is_available === false).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
                <span><strong>{o.override_date}</strong>{o.reason ? ` — ${o.reason}` : ""}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeOverride.mutate(o.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {(overrides || []).filter((o) => o.is_available === false).length === 0 && (
              <p className="text-xs text-muted-foreground">No upcoming days marked off.</p>
            )}
          </div>
        </Card>
      </div>
    </VendorLayout>
  );
}
