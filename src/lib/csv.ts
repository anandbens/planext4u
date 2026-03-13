// CSV Export utility — sanitizes values to prevent formula injection
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string
) {
  const sanitize = (val: any): string => {
    const str = String(val ?? "");
    // Prevent CSV formula injection
    if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
    // Wrap in quotes if contains comma, quote, or newline
    if (/[,"\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map((c) => sanitize(c.label)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => sanitize(row[c.key])).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Simple wrapper for report pages
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  keys: string[],
  filename: string
) {
  const columns = keys.map((k) => ({ key: k, label: k }));
  exportToCSV(data, columns, filename);
}
