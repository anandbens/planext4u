import { useState, useEffect, ReactNode } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Calendar, Plus, Trash2, CheckSquare, XSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

export interface SummaryWidget {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string; // tailwind bg class like "bg-primary/10"
  textColor?: string; // tailwind text class
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  onExport?: () => void;
  onRowClick?: (item: T) => void;
  onAdd?: () => void;
  addLabel?: string;
  searchPlaceholder?: string;
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  onFilterChange?: (key: string, value: string) => void;
  onDateRangeChange?: (from: string | undefined, to: string | undefined) => void;
  dateFilterLabel?: string;
  showDateFilter?: boolean;
  // Bulk actions
  enableBulkSelect?: boolean;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusUpdate?: (ids: string[], status: string) => void;
  bulkStatusOptions?: { value: string; label: string }[];
  // Summary widgets
  summaryWidgets?: SummaryWidget[];
}

export function DataTable<T extends Record<string, any>>({
  columns, data, total, page, perPage, totalPages,
  onPageChange, onSearch, onExport, onRowClick, onAdd, addLabel = "Add New",
  searchPlaceholder = "Search...",
  filters, onFilterChange, onDateRangeChange, dateFilterLabel = "Date", showDateFilter = true,
  enableBulkSelect = false, onBulkDelete, onBulkStatusUpdate, bulkStatusOptions,
  summaryWidgets,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  // Clear selection on data change
  useEffect(() => { setSelectedIds(new Set()); }, [data]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { onSearch?.(search); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onDateRangeChange?.(date ? format(date, 'yyyy-MM-dd') : undefined, dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onDateRangeChange?.(dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined, date ? format(date, 'yyyy-MM-dd') : undefined);
  };

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onDateRangeChange?.(undefined, undefined);
  };

  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((item) => item.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="space-y-4">
      {/* Summary Widgets */}
      {summaryWidgets && summaryWidgets.length > 0 && (
        <div className={`grid gap-3 ${
          summaryWidgets.length === 1 ? 'grid-cols-1' :
          summaryWidgets.length === 2 ? 'grid-cols-2' :
          summaryWidgets.length === 3 ? 'grid-cols-3' :
          summaryWidgets.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        }`}>
          {summaryWidgets.map((w, i) => (
            <div key={i} className={`rounded-xl border border-border/50 p-4 ${w.color || 'bg-card'}`} style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-2">
                {w.icon && <div className="shrink-0">{w.icon}</div>}
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{w.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${w.textColor || ''}`}>{typeof w.value === 'number' ? w.value.toLocaleString() : w.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {/* Bulk Actions Bar */}
        {enableBulkSelect && someSelected && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              {bulkStatusOptions && onBulkStatusUpdate && (
                <div className="flex items-center gap-1.5">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkStatusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={!bulkStatus}
                    onClick={() => { onBulkStatusUpdate(selectedArray, bulkStatus); setBulkStatus(""); setSelectedIds(new Set()); }}>
                    <CheckSquare className="h-3.5 w-3.5" /> Apply
                  </Button>
                </div>
              )}
              {onBulkDelete && (
                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1"
                  onClick={() => { onBulkDelete(selectedArray); setSelectedIds(new Set()); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.size})
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setSelectedIds(new Set())}>
                <XSquare className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border/50">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary/50 border-0 h-9"
              />
            </div>
            {filters?.map((f) => (
              <Select key={f.key} onValueChange={(v) => onFilterChange?.(f.key, v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 h-9 bg-secondary/50 border-0">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {showDateFilter && onDateRangeChange && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'From Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarWidget mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, 'dd MMM yyyy') : 'To Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarWidget mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus disabled={(date) => date > new Date()} />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearDates}>
                    Clear
                  </Button>
                )}
              </>
            )}
            {onAdd && (
              <Button size="sm" onClick={onAdd} className="gap-2 h-9">
                <Plus className="h-4 w-4" /> {addLabel}
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="gap-2 h-9">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr className="bg-secondary/30">
                {enableBulkSelect && (
                  <th className="w-10 px-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </th>
                )}
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableBulkSelect ? 1 : 0)} className="text-center py-12 text-muted-foreground">
                    No results found
                  </td>
                </tr>
              ) : (
                data.map((item, i) => (
                  <tr key={item.id || i}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {enableBulkSelect && (
                      <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleOne(item.id)} aria-label={`Select ${item.id}`} />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `Showing ${((page - 1) * perPage) + 1}–${Math.min(page * perPage, total)} of ${total.toLocaleString()}` : "No results"}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="text-muted-foreground px-1">...</span>}
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
