"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Trash2, Bell, BellOff } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, string>;
  notify_new_matches: boolean;
  created_at: string;
  last_viewed_at: string | null;
}

interface SavedSearchesListProps {
  userId: string;
}

export default function SavedSearchesList({ userId }: SavedSearchesListProps) {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSearches();
  }, []);

  async function fetchSearches() {
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/saved-searches", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearches(data.searches || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved searches:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(searchId: string) {
    if (!confirm("Are you sure you want to delete this saved search?")) {
      return;
    }

    setDeletingId(searchId);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `/api/saved-searches?search_id=${searchId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        await fetchSearches();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete search");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete search");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleNotifications(search: SavedSearch) {
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch("/api/saved-searches", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          search_id: search.id,
          notify_new_matches: !search.notify_new_matches,
        }),
      });

      if (response.ok) {
        await fetchSearches();
      }
    } catch (error) {
      console.error("Toggle notifications error:", error);
    }
  }

  function buildSearchUrl(filters: Record<string, string>): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.set(key, value);
    });
    return `/search?${params.toString()}`;
  }

  function formatFilters(filters: Record<string, string>): string {
    const parts: string[] = [];
    
    if (filters.q) parts.push(`"${filters.q}"`);
    if (filters.category) parts.push(filters.category);
    if (filters.make) parts.push(filters.make);
    if (filters.model) parts.push(filters.model);
    if (filters.condition) parts.push(filters.condition);
    if (filters.price_min || filters.price_max) {
      const min = filters.price_min || "0";
      const max = filters.price_max || "∞";
      parts.push(`£${min}-${max}`);
    }
    
    return parts.join(" • ") || "All listings";
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Saved Searches</h1>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && searches.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No saved searches yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Save your search filters for quick access. Look for the &quot;Save Search&quot;
            button when browsing listings.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
          >
            Browse Listings
          </Link>
        </div>
      )}

      {/* Searches List */}
      {!loading && searches.length > 0 && (
        <div className="space-y-4">
          {searches.map((search) => (
            <div
              key={search.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {search.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatFilters(search.filters)}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Saved {formatDate(search.created_at)}
                      {search.last_viewed_at &&
                        ` • Last viewed ${formatDate(search.last_viewed_at)}`}
                    </p>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {/* Notifications Toggle */}
                    <button
                      onClick={() => toggleNotifications(search)}
                      className={`rounded-lg p-2 transition-colors ${
                        search.notify_new_matches
                          ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                      title={
                        search.notify_new_matches
                          ? "Notifications enabled"
                          : "Notifications disabled"
                      }
                    >
                      {search.notify_new_matches ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(search.id)}
                      disabled={deletingId === search.id}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Delete search"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Run Search Button */}
                <div className="mt-4">
                  <Link
                    href={buildSearchUrl(search.filters)}
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
                  >
                    <Search className="h-4 w-4" />
                    Run This Search
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
