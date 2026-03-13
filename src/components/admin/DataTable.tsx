import { useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
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
  searchPlaceholder?: string;
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  onFilterChange?: (key: string, value: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, total, page, perPage, totalPages,
  onPageChange, onSearch, onExport, searchPlaceholder = "Search...",
  filters, onFilterChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const handleSearch = (val: string) => {
    setSearch(val);
    onSearch?.(val);
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border/50">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-secondary/50 border-0 h-9"
            />
          </div>
          {filters?.map((f) => (
            <Select key={f.key} onValueChange={(v) => onFilterChange?.(f.key, v)}>
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
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr className="bg-secondary/30">
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.id || i} className="transition-colors">
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/20">
        <p className="text-sm text-muted-foreground">
          Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
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
  );
}
