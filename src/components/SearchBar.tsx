"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Package, ChevronDown } from "lucide-react";
import { nsKey } from "@/lib/auth";

type SearchSuggestion = {
  type: "part" | "seller" | "recent";
  label: string;
  subtitle?: string;
  url: string;
};

type Props = {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
};

const CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "OEM Parts", value: "oem" },
  { label: "Aftermarket Parts", value: "aftermarket" },
  { label: "Tools & Accessories", value: "tools" },
];

export default function SearchBar({ initialQuery = "", placeholder = "Search parts or sellers…", autoFocus, compact = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const key = nsKey("recent_searches");
      const legacyKey = "ms:recent-searches";
      const raw = localStorage.getItem(key) || localStorage.getItem(legacyKey);
      const arr = raw ? JSON.parse(raw) : [];
      setRecentSearches(Array.isArray(arr) ? arr.slice(0, 5) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!query.trim()) {
      // Show recent searches when input is empty
      const recent: SearchSuggestion[] = recentSearches.map((r) => ({
        type: "recent",
        label: r,
        url: `/search?q=${encodeURIComponent(r)}`,
      }));
      setSuggestions(recent);
      return;
    }

    // Debounced search
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, recentSearches]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    
    // Allow search even without query (will show all results, optionally filtered by category)
    let searchUrl = "/search";
    const params = new URLSearchParams();
    
    if (q) {
      params.set("q", q);
      // Save to recent searches
      try {
        const key = nsKey("recent_searches");
        const arr = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 10);
        localStorage.setItem(key, JSON.stringify(arr));
        setRecentSearches(arr.slice(0, 5));
      } catch {
        // ignore
      }
    }
    
    if (category) {
      params.set("category", category);
    }
    
    const queryString = params.toString();
    if (queryString) {
      searchUrl += `?${queryString}`;
    }

    setShowSuggestions(false);
    router.push(searchUrl);
  }

  function clearQuery() {
    setQuery("");
    inputRef.current?.focus();
  }

  function handleSuggestionClick(suggestion: SearchSuggestion) {
    // Save to recent if it's a search
    if (suggestion.type !== "recent") {
      try {
        const key = nsKey("recent_searches");
        const arr = [suggestion.label, ...recentSearches.filter((s) => s !== suggestion.label)].slice(0, 10);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch {
        // ignore
      }
    }

    setShowSuggestions(false);
    router.push(suggestion.url);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center w-full border border-gray-300 rounded-full focus-within:ring-2 focus-within:ring-yellow-400 bg-white shadow-sm ${compact ? "pl-3 pr-1 py-0.5" : "pl-4 pr-1 py-1"}`}>
          {/* Category Dropdown - only show on desktop */}
          <div className="relative flex-shrink-0 hidden sm:block">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`appearance-none border-none bg-transparent pr-5 focus:ring-0 text-gray-700 font-medium cursor-pointer ${compact ? "text-xs" : "text-sm"}`}
              aria-label="Category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 mr-2" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500 bg-transparent outline-none ${compact ? "text-sm" : "text-[15px]"} sm:ml-2`}
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="mr-1 p-1 hover:bg-gray-100 rounded-full transition"
              aria-label="Clear search"
            >
              <X size={compact ? 14 : 16} className="text-gray-400" />
            </button>
          )}
          
          {/* Search Button - prominent blue like eBay */}
          <button
            type="submit"
            className={`flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors ${compact ? "w-8 h-8" : "w-10 h-10"}`}
            aria-label="Search"
          >
            <Search size={compact ? 16 : 18} />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-b-0"
            >
              {suggestion.type === "seller" ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <User size={16} className="text-yellow-700" />
                </div>
              ) : suggestion.type === "recent" ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search size={14} className="text-gray-500" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package size={16} className="text-blue-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{suggestion.label}</div>
                {suggestion.subtitle && <div className="text-xs text-gray-600 truncate">{suggestion.subtitle}</div>}
              </div>
              {suggestion.type === "recent" && (
                <span className="text-xs text-gray-400">Recent</span>
              )}
              {suggestion.type === "seller" && (
                <span className="text-xs text-gray-400">Seller</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
