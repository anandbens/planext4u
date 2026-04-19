// Compact date/time formatter used in admin grids for created_at / updated_at columns.
export function fmtTs(value?: string | number | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
