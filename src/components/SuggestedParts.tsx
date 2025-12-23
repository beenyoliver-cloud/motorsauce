"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import { CardSkeleton } from "@/components/skeletons/Skeletons";
import { loadMyCars } from "@/lib/garage";
import { addToCartById } from "@/lib/cartStore";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
};

type Props = { limit?: number };

type FilterId = "all" | "under100" | "performance" | "interior" | "exterior";

const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Fresh matches" },
  { id: "under100", label: "Under £100" },
  { id: "performance", label: "Performance" },
  { id: "interior", label: "Interior" },
  { id: "exterior", label: "Exterior" },
];

function parsePrice(value: string) {
  const numeric = parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : Infinity;
}

function matchesFilter(listing: Listing, filter: FilterId) {
  if (filter === "all") return true;
  const price = parsePrice(listing.price || "");
  if (filter === "under100") return price < 100;

  const title = listing.title.toLowerCase();
  if (filter === "performance") {
    return /(turbo|coil|spring|performance|race|intake|remap|exhaust|hp|bhp)/.test(title);
  }
  if (filter === "interior") {
    return /(seat|dash|trim|screen|infotainment|stereo|carplay|interior|wheel)/.test(title);
  }
  if (filter === "exterior") {
    return /(lip|spoiler|splitter|wing|light|mirror|aero|body|exterior)/.test(title);
  }
  return true;
}

export default function SuggestedParts({ limit = 12 }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [addingId, setAddingId] = useState<string | number | null>(null);
  const [addedId, setAddedId] = useState<string | number | null>(null);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const garage = loadMyCars();
        let searches: string[] = [];
        try {
          const raw = localStorage.getItem("ms:recent-searches");
          searches = raw ? JSON.parse(raw) : [];
        } catch {}

        const body = { garage, searches };
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          const lim = Number.isFinite(limit as number) ? (limit as number) : 12;
          if (Array.isArray(data)) setListings(data.slice(0, lim));
        }
      } catch (err) {
        console.error("suggestions failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [limit]);

  const listingsByFilter = useMemo(() => {
    const map = new Map<FilterId, Listing[]>();
    for (const f of filters) {
      map.set(f.id, listings.filter((listing) => matchesFilter(listing, f.id)));
    }
    return map;
  }, [listings]);

  useEffect(() => {
    if (!addedId) return;
    const timeout = setTimeout(() => setAddedId(null), 2000);
    return () => clearTimeout(timeout);
  }, [addedId]);

  async function quickAdd(id: string | number) {
    try {
      setQuickAddError(null);
      setAddingId(id);
      await addToCartById(String(id));
      setAddedId(id);
    } catch (err) {
      console.error("quick add failed", err);
      setQuickAddError("Unable to add to basket right now.");
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="min-w-[220px] flex-1">
            <CardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="py-8 text-gray-600">
        No suggested parts yet. Add vehicles to your garage to get personalised matches.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {quickAddError && <div className="text-xs text-red-600">{quickAddError}</div>}

      {filters.map((filter) => {
        const list = (listingsByFilter.get(filter.id) || []).slice(0, 6);
        if (list.length === 0) return null;

        return (
          <section key={filter.id} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{filter.label}</h3>
              <button
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`text-xs sm:text-sm ${
                  activeFilter === filter.id ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {activeFilter === filter.id ? "Selected" : "Focus"}
              </button>
            </div>

            {/* Horizontal scroll row: show ~2.5 cards across on mobile and allow swipe/trackpad scroll */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3">
                {list.map((p) => (
                  <article
                    key={`${filter.id}-${p.id}`}
                    data-listing-card={String(p.id)}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col shrink-0 w-[36%] sm:w-[140px] md:w-[160px] lg:w-[180px]"
                  >
                    <Link href={`/listing/${p.id}`} className="block relative aspect-[4/3] overflow-hidden rounded-t-2xl">
                      <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                    </Link>
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 line-clamp-2">{p.title}</h4>
                        <div className="mt-1 text-lg font-bold text-gray-900">{p.price}</div>
                      </div>
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          onClick={() => quickAdd(p.id)}
                          disabled={addingId === p.id}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 text-white text-sm font-semibold px-3 py-2 hover:bg-slate-800 disabled:opacity-70"
                        >
                          {addingId === p.id ? (
                            <span className="inline-flex items-center gap-2 text-xs">
                              <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              Adding…
                            </span>
                          ) : (
                            <>
                              <ShoppingCart size={16} />
                              {addedId === p.id ? "Added!" : "Quick add"}
                            </>
                          )}
                        </button>
                        <Link
                          href={`/listing/${p.id}`}
                          className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
