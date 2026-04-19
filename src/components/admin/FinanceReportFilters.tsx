// Shared filter bar for India GST finance reports
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { getCurrentFinancialYear, INDIA_STATES } from "@/lib/xlsx-export";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export interface FinanceFiltersValue {
  fyStart: number;     // FY start year, e.g. 2024 → FY 2024-25
  month: number;       // 0-11, or -1 for "Whole FY"
  vendorId: string;    // "all" or vendor id
  stateCode: string;   // "all" or state code
}

interface Props {
  value: FinanceFiltersValue;
  onChange: (v: FinanceFiltersValue) => void;
  vendors: { id: string; name: string }[];
  onExportCSV: () => void;
  onExportXLSX: () => void;
}

export default function FinanceReportFilters({ value, onChange, vendors, onExportCSV, onExportXLSX }: Props) {
  const currentFY = getCurrentFinancialYear();
  const fyOptions = [currentFY, currentFY - 1, currentFY - 2, currentFY - 3];

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">FY:</span>
          <Select value={String(value.fyStart)} onValueChange={(v) => onChange({ ...value, fyStart: Number(v) })}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fyOptions.map(y => (
                <SelectItem key={y} value={String(y)}>FY {y}-{String(y + 1).slice(-2)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Month:</span>
          <Select value={String(value.month)} onValueChange={(v) => onChange({ ...value, month: Number(v) })}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">Whole FY</SelectItem>
              {[3,4,5,6,7,8,9,10,11,0,1,2].map(m => (
                <SelectItem key={m} value={String(m)}>{MONTHS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Vendor:</span>
          <Select value={value.vendorId} onValueChange={(v) => onChange({ ...value, vendorId: v })}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">State:</span>
          <Select value={value.stateCode} onValueChange={(v) => onChange({ ...value, stateCode: v })}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {INDIA_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={onExportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={onExportXLSX}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function getDateRangeFromFilters(v: FinanceFiltersValue): { from: Date; to: Date; label: string } {
  if (v.month === -1) {
    return {
      from: new Date(v.fyStart, 3, 1, 0, 0, 0),
      to: new Date(v.fyStart + 1, 2, 31, 23, 59, 59),
      label: `FY ${v.fyStart}-${String(v.fyStart + 1).slice(-2)}`,
    };
  }
  // Month belongs to FY: months 3..11 are in fyStart year, 0..2 are in fyStart+1
  const year = v.month >= 3 ? v.fyStart : v.fyStart + 1;
  const from = new Date(year, v.month, 1, 0, 0, 0);
  const to = new Date(year, v.month + 1, 0, 23, 59, 59);
  return { from, to, label: `${MONTHS[v.month]} ${year}` };
}
