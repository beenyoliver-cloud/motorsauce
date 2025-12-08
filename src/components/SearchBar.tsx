"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Package } from "lucide-react";
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

export default function SearchBar({ initialQuery = "", placeholder = "Search parts or sellers…", autoFocus, compact = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
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
    if (!q) return;

    // Save to recent searches
    try {
      const key = nsKey("recent_searches");
      const arr = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(arr));
      setRecentSearches(arr.slice(0, 5));
    } catch {
      // ignore
    }

    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
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
        <div className={`flex items-center w-full border border-gray-300 rounded-full focus-within:ring-2 focus-within:ring-yellow-400 bg-white shadow-sm ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>
          <Search className="text-gray-400 mr-2 flex-shrink-0" size={compact ? 16 : 18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500 bg-transparent outline-none ${compact ? "text-sm" : "text-[15px]"}`}
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="ml-2 p-1 hover:bg-gray-100 rounded-full transition"
              aria-label="Clear search"
            >
              <X size={compact ? 14 : 16} className="text-gray-400" />
            </button>
          )}
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
