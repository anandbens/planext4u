import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ImpactRow {
  label: string;
  count: number;
  note?: string;
  /** When true, this row is rendered with destructive emphasis (red) */
  critical?: boolean;
}

interface ImpactConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Plain-text intro shown above the impact rows */
  description: string;
  impacts: ImpactRow[];
  /** Optional rows still loading */
  loading?: boolean;
  /** Action submission state */
  submitting?: boolean;
  /** Confirmation phrase the admin must type to enable the action (e.g. "DELETE"). */
  confirmPhrase?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ImpactConfirmDialog({
  open, onOpenChange, title, description, impacts,
  loading, submitting, confirmPhrase = "DELETE", confirmLabel = "Permanently Delete",
  onConfirm,
}: ImpactConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (!open) setTyped(""); }, [open]);

  const phraseOk = typed.trim().toUpperCase() === confirmPhrase.toUpperCase();
  const totalAffected = impacts.reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive mb-2">
              Records that will be permanently affected ({totalAffected.toLocaleString()})
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking related data…
              </div>
            ) : impacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No related records found.</p>
            ) : (
              <ul className="space-y-1.5">
                {impacts.map((row) => (
                  <li
                    key={row.label}
                    className={`flex items-start justify-between text-xs ${row.critical ? "text-destructive" : "text-foreground"}`}
                  >
                    <span>
                      <span className="font-medium">{row.label}</span>
                      {row.note ? <span className="text-muted-foreground"> — {row.note}</span> : null}
                    </span>
                    <span className="font-bold tabular-nums ml-3">{row.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            This action cannot be undone. Reports, settlements and audit history that reference these
            records will lose their source data.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Type <span className="font-mono font-bold text-destructive">{confirmPhrase}</span> to confirm
            </Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              className="h-9 font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={submitting || loading || !phraseOk}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
