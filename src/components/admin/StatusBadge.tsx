import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  verified: "bg-success/10 text-success",
  approved: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  delivered: "bg-success/10 text-success",
  settled: "bg-success/10 text-success",
  eligible: "bg-info/10 text-info",
  paid: "bg-info/10 text-info",
  accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  placed: "bg-warning/10 text-warning",
  pending: "bg-warning/10 text-warning",
  pending_approval: "bg-warning/10 text-warning",
  level1_approved: "bg-warning/10 text-warning",
  level2_approved: "bg-info/10 text-info",
  inactive: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
  on_hold: "bg-destructive/10 text-destructive",
  sold: "bg-accent text-accent-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
      statusStyles[status] || "bg-muted text-muted-foreground"
    )}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
