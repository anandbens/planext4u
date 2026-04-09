import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/csv";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  exportKey?: string; // key to use for CSV export if different from render
}

export interface FilterOption {
  label: string;
  value: string;
}

interface ReportDataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  searchKeys?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange?: (d: Date) => void;
  onDateToChange?: (d: Date) => void;
  statusFilter?: { options: FilterOption[]; value: string; onChange: (v: string) => void; label?: string };
  extraFilters?: React.ReactNode;
  exportFilename?: string;
  title?: string;
  subtitle?: string;
  summaryCards?: React.ReactNode;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function ReportDataGrid<T extends Record<string, any>>({
  data, columns, loading = false, pageSize: defaultPageSize = 25,
  searchPlaceholder = "Search...", searchKeys = [],
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  statusFilter, extraFilters, exportFilename = "report",
  title, subtitle, summaryCards,
}: ReportDataGridProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Filter by search
  const filtered = useMemo(() => {
    let result = data;
    if (search.trim() && searchKeys.length > 0) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        searchKeys.some(k => String(row[k] ?? "").toLowerCase().includes(q))
      );
    }
    return result;
  }, [data, search, searchKeys]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  };

  const handleExport = () => {
    const exportCols = columns.map(c => ({
      key: c.exportKey || c.key,
      label: c.label,
    }));
    exportToCSV(sorted, exportCols, exportFilename);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || subtitle) && (
        <div>
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-description">{subtitle}</p>}
        </div>
      )}

      {/* Summary Cards */}
      {summaryCards}

      {/* Filters Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Date Range */}
          {onDateFromChange && dateFrom && (
            <DatePicker label="From" date={dateFrom} setDate={onDateFromChange} />
          )}
          {onDateToChange && dateTo && (
            <DatePicker label="To" date={dateTo} setDate={onDateToChange} />
          )}

          {/* Status Filter */}
          {statusFilter && (
            <Select value={statusFilter.value} onValueChange={v => { statusFilter.onChange(v); setPage(0); }}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder={statusFilter.label || "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statusFilter.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {extraFilters}

          {/* Export */}
          <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </Card>

      {/* Data Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.sortable && "cursor-pointer hover:text-foreground select-none"
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        sortKey === col.key
                          ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {columns.map(c => (
                      <td key={c.key} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              ) : (
                paged.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5 whitespace-nowrap",
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        )}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/30 bg-muted/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {sorted.length > 0
                ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`
                : "0 records"}
            </span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DatePicker({ label, date, setDate }: { label: string; date: Date; setDate: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal text-xs", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          {date ? format(date, "MMM dd, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
