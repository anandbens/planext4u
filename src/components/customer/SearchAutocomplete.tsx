import { useState, useEffect, useRef } from "react";
import { Search, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const RECENT_SEARCH_KEY = "app_db_recent_searches";
const SOCIAL_RECENT_SEARCH_KEY = "app_db_social_recent_searches";

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
  socialMode?: boolean;
  servicesMode?: boolean;
}

interface SocialUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

export function SearchAutocomplete({ onSearch, placeholder, className, socialMode }: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const effectivePlaceholder = placeholder ?? (socialMode ? "Search user" : 'Search for "Electronics"');
  const recentKey = socialMode ? SOCIAL_RECENT_SEARCH_KEY : RECENT_SEARCH_KEY;

  function loadRecent(): string[] {
    try {
      const raw = localStorage.getItem(recentKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return socialMode ? [] : ["Mobiles", "Headphones", "Running Shoes", "Laptops", "AC Repair"];
  }
  function saveRecent(searches: string[]) {
    localStorage.setItem(recentKey, JSON.stringify(searches.slice(0, 10)));
  }

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecent);
  const [searchItems, setSearchItems] = useState<string[]>([]);
  const [userResults, setUserResults] = useState<SocialUser[]>([]);
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

  // Load search items from DB on mount (non-social mode only)
  useEffect(() => {
    if (socialMode) return;
    async function loadItems() {
      const [{ data: cats }, { data: prods }, { data: srvs }] = await Promise.all([
        supabase.from("categories").select("name").limit(50),
        supabase.from("products").select("title").eq("status", "active").limit(100),
        supabase.from("services").select("title").eq("status", "active").limit(50),
      ]);
      const items = [
        ...(cats || []).map((c: any) => c.name),
        ...(prods || []).map((p: any) => p.title),
        ...(srvs || []).map((s: any) => s.title),
      ];
      setSearchItems(items);
    }
    loadItems();
  }, [socialMode]);

  // Social mode: live user search by username/display_name
  useEffect(() => {
    if (!socialMode) return;
    if (query.trim().length < 2) { setUserResults([]); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const term = query.trim();
      const { data } = await supabase
        .from("social_profiles")
        .select("id, user_id, username, display_name, avatar_url, is_verified")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(8);
      if (!cancelled) setUserResults((data as SocialUser[]) || []);
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, socialMode]);

  const suggestions = !socialMode && query.length >= 2
    ? searchItems.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 10);
    setRecentSearches(updated);
    saveRecent(updated);
    setQuery("");
    setFocused(false);
    onSearch(q);
  };

  const handleSelectUser = (u: SocialUser) => {
    const updated = [u.username, ...recentSearches.filter(s => s !== u.username)].slice(0, 10);
    setRecentSearches(updated);
    saveRecent(updated);
    setQuery("");
    setFocused(false);
    navigate(`/app/social/profile/${u.user_id}`);
  };

  const removeRecent = (item: string) => {
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    saveRecent(updated);
  };

  const clearAll = () => {
    setRecentSearches([]);
    saveRecent([]);
  };

  const showDropdown = focused && (
    recentSearches.length > 0 ||
    (socialMode ? userResults.length > 0 : suggestions.length > 0) ||
    query.length >= 2
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); if (!socialMode) handleSubmit(query); }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder={effectivePlaceholder}
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
                  <button onClick={() => socialMode ? setQuery(item) : handleSubmit(item)} className="flex items-center gap-2 text-sm text-muted-foreground flex-1 text-left">
                    <Search className="h-3.5 w-3.5" /> {item}
                  </button>
                  <button onClick={() => removeRecent(item)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {socialMode && userResults.length > 0 && (
            <div className="p-2 border-t border-border/30">
              {userResults.map((u) => (
                <button key={u.id} onClick={() => handleSelectUser(u)}
                  className="flex items-center gap-3 w-full text-left py-2 px-2 hover:bg-accent/30 rounded-lg">
                  <Avatar className="h-9 w-9">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> :
                      <AvatarFallback className="bg-muted text-xs font-bold">{u.username?.charAt(0).toUpperCase()}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.username}</p>
                    {u.display_name && <p className="text-xs text-muted-foreground truncate">{u.display_name}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!socialMode && suggestions.length > 0 && (
            <div className="p-3 border-t border-border/30">
              {suggestions.map((item) => (
                <button key={item} onClick={() => handleSubmit(item)}
                  className="flex items-center gap-2 w-full text-left py-1.5 px-2 text-sm hover:bg-accent/30 rounded-lg">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" /> {item}
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && (socialMode ? userResults.length === 0 : suggestions.length === 0) && (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{socialMode ? `No users found for "${query}"` : `No results found for "${query}"`}</p>
              <p className="text-xs text-muted-foreground mt-1">{socialMode ? "Try a different username" : "Try a different search term"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
