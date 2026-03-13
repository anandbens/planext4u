import { useState, useEffect, useRef } from "react";
import { Search, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MOCK_PRODUCTS, MOCK_SERVICES, MOCK_CATEGORIES } from "@/lib/mockData";

const RECENT_SEARCH_KEY = "app_db_recent_searches";

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ["Mobiles", "Headphones", "Running Shoes", "Laptops", "AC Repair"];
}

function saveRecentSearches(searches: string[]) {
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(searches.slice(0, 10)));
}

interface SearchAutocompleteProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchAutocomplete({ onSearch, placeholder = 'Search for "Electronics"', className }: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = query.length >= 2
    ? [
        ...MOCK_CATEGORIES.map(c => c.name),
        ...MOCK_PRODUCTS.map(p => p.title),
        ...MOCK_SERVICES.map(s => s.title),
      ].filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 10);
    setRecentSearches(updated);
    saveRecentSearches(updated);
    setQuery("");
    setFocused(false);
    onSearch(q);
  };

  const removeRecent = (item: string) => {
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    saveRecentSearches(updated);
  };

  const clearAll = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const showDropdown = focused && (recentSearches.length > 0 || suggestions.length > 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(query); }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="pl-9 bg-secondary/50 border-border/60 h-10 lg:h-11 text-sm lg:text-base"
        />
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden">
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Recent Search</span>
                <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
              </div>
              {recentSearches.map((item) => (
                <div key={item} className="flex items-center justify-between py-1.5 hover:bg-accent/30 px-2 rounded-lg cursor-pointer group">
                  <button onClick={() => handleSubmit(item)} className="flex items-center gap-2 text-sm text-muted-foreground flex-1 text-left">
                    <Search className="h-3.5 w-3.5" /> {item}
                  </button>
                  <button onClick={() => removeRecent(item)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="p-3 border-t border-border/30">
              {suggestions.map((item) => (
                <button key={item} onClick={() => handleSubmit(item)}
                  className="flex items-center gap-2 w-full text-left py-1.5 px-2 text-sm hover:bg-accent/30 rounded-lg">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" /> {item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
