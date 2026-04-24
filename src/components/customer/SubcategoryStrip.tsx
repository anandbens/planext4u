import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Category } from "@/lib/api";

interface SubcategoryStripProps {
  parentName: string;
  subcategories: Category[];
  /** Highlight a subcategory tile (e.g. when the user is currently viewing it). */
  activeName?: string;
  /** Hide the "Shop X" heading + "View All" sheet trigger; render the tile rail only. */
  hideHeader?: boolean;
}

export function SubcategoryStrip({
  parentName,
  subcategories,
  activeName,
  hideHeader = false,
}: SubcategoryStripProps) {
  const [open, setOpen] = useState(false);
  if (!subcategories.length) return null;

  // When the strip is used to navigate within a subcategory view, surface ALL
  // siblings inline (no truncation) so the active tile is always reachable.
  const visible = hideHeader ? subcategories : subcategories.slice(0, 7);
  const hasMore = !hideHeader && subcategories.length > visible.length;

  return (
    <section className="mb-5">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base md:text-lg font-bold">Shop {parentName}</h2>
          {hasMore && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="text-xs text-primary flex items-center gap-0.5 font-medium">
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>All {parentName} subcategories</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-6">
                  {subcategories.map((s) => (
                    <Link
                      key={s.id}
                      to={`/app/browse?category=${encodeURIComponent(s.name)}`}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-secondary/40 flex items-center justify-center overflow-hidden">
                        {s.image && (s.image.startsWith("/") || s.image.startsWith("http")) ? (
                          <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{s.image || "📦"}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-center line-clamp-2 leading-tight">
                        {s.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {visible.map((s) => {
          const isActive = activeName === s.name;
          return (
            <Link
              key={s.id}
              to={`/app/browse?category=${encodeURIComponent(s.name)}`}
              className="shrink-0"
            >
              <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 bg-card transition-all overflow-hidden ${
                    isActive
                      ? "cat-themed-border cat-themed-soft-bg shadow-sm"
                      : "border-border/50 hover:border-primary/40"
                  }`}
                >
                  {s.image && (s.image.startsWith("/") || s.image.startsWith("http")) ? (
                    <img src={s.image} alt={s.name} className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span className="text-xl">{s.image || "📦"}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium text-center leading-tight max-w-[72px] line-clamp-2 ${
                    isActive ? "cat-themed-text font-semibold" : ""
                  }`}
                >
                  {s.name}
                </span>
              </div>
            </Link>
          );
        })}
        {hasMore && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 flex flex-col items-center gap-1.5 min-w-[72px]"
          >
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center border-2 border-dashed border-primary/40 bg-primary/5 text-primary">
              <ChevronRight className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-primary">View All</span>
          </button>
        )}
      </div>
    </section>
  );
}
