import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api, Category } from "@/lib/api";

export default function AllCategoriesPage() {
  const [search, setSearch] = useState("");
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const parents = useMemo(() => {
    const list = (categories || [])
      .filter((c) => !c.parent_id && c.status === "active")
      .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const subCount = (parentId: string) =>
    (categories || []).filter((c) => c.parent_id === parentId && c.status === "active").length;

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 py-4 pb-24">
        <h1 className="text-xl font-bold mb-1">All Categories</h1>
        <p className="text-xs text-muted-foreground mb-4">Browse everything we have to offer</p>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="pl-9 h-11"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : parents.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No categories found</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {parents.map((c: Category) => (
              <Link
                key={c.id}
                to={`/app/browse?category=${encodeURIComponent(c.name)}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-20 w-20 rounded-2xl bg-secondary/40 flex items-center justify-center overflow-hidden">
                  {c.image && (c.image.startsWith("/") || c.image.startsWith("http")) ? (
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-3xl">{c.image || "📦"}</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-center line-clamp-2 leading-tight">
                  {c.name}
                </span>
                {subCount(c.id) > 0 && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                    {subCount(c.id)} subcategories <ChevronRight className="h-2.5 w-2.5" />
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
