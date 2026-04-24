import { useNavigate } from "react-router-dom";
import type { Category } from "@/lib/api";

/**
 * Little Joys-inspired vertical category rail. Shows top-level categories on the
 * left edge of the shop browse page. Tapping an item drives the URL `?category=`
 * filter so the product grid (and subcategory chips) re-render in place.
 *
 * Renders a compact rail (icon + label) with the active item highlighted with a
 * left primary bar — matches the reference screenshots while staying inside our
 * design tokens (no raw hex). Works on mobile (narrow rail) and desktop (slightly
 * wider). Hidden when no parent categories exist.
 */
interface CategoryRailProps {
  categories: Category[];
  activeName?: string;
  /** Optional: when active category is a subcategory we still want the parent
   *  highlighted in the rail — caller can pass the resolved parent name. */
  activeParentName?: string;
}

export function CategoryRail({ categories, activeName, activeParentName }: CategoryRailProps) {
  const navigate = useNavigate();
  const parents = categories
    .filter((c) => !c.parent_id && c.status === "active")
    .sort(
      (a, b) =>
        ((a as any).display_order ?? 999) - ((b as any).display_order ?? 999) ||
        a.name.localeCompare(b.name),
    );

  if (!parents.length) return null;

  const activeKey = activeParentName || activeName;

  return (
    <aside className="shrink-0 w-20 md:w-24 bg-secondary/30 border-r border-border/40 overflow-y-auto scrollbar-hide">
      <ul className="flex flex-col">
        {parents.map((c) => {
          const isActive = c.name === activeKey;
          return (
            <li key={c.id}>
              <button
                onClick={() => navigate(`/app/browse?category=${encodeURIComponent(c.name)}`)}
                className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-1.5 text-center transition-colors ${
                  isActive
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:bg-card/60"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                )}
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center overflow-hidden border ${
                    isActive ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card"
                  }`}
                >
                  {c.image && (c.image.startsWith("/") || c.image.startsWith("http")) ? (
                    <img src={c.image} alt={c.name} className="h-9 w-9 object-cover rounded-lg" />
                  ) : (
                    <span className="text-xl">{c.image || "📦"}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight line-clamp-2 ${
                    isActive ? "font-semibold text-foreground" : "font-medium"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
