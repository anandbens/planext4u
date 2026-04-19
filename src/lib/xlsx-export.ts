// Multi-sheet XLSX export helper for finance/audit reports
import * as XLSX from "xlsx";

export interface SheetSpec {
  name: string;
  rows: Record<string, any>[];
  columns?: { key: string; label: string; width?: number }[];
}

export function exportToXLSX(filename: string, sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    let ws;
    if (sheet.columns && sheet.columns.length > 0) {
      const header = sheet.columns.map(c => c.label);
      const data = sheet.rows.map(r => sheet.columns!.map(c => r[c.key] ?? ""));
      ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws["!cols"] = sheet.columns.map(c => ({ wch: c.width ?? Math.max(12, c.label.length + 2) }));
    } else {
      ws = XLSX.utils.json_to_sheet(sheet.rows);
    }
    // Truncate sheet name to Excel's 31-char limit
    const safeName = sheet.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}

// Indian financial year helper: FY runs Apr 1 → Mar 31
export function getFinancialYearRange(fyStartYear: number): { from: Date; to: Date; label: string } {
  return {
    from: new Date(fyStartYear, 3, 1, 0, 0, 0),
    to: new Date(fyStartYear + 1, 2, 31, 23, 59, 59),
    label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
  };
}

export function getCurrentFinancialYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

// India state codes (GST)
export const INDIA_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu and Kashmir" }, { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" }, { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" }, { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" }, { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" }, { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" }, { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" }, { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" }, { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" }, { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" }, { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" }, { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" }, { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" }, { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" }, { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" }, { code: "34", name: "Puducherry" },
  { code: "36", name: "Telangana" }, { code: "37", name: "Andhra Pradesh" },
];
