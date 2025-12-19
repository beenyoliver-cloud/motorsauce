"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Sparkles } from "lucide-react";
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

const filters: { id: FilterId; label: string; helper: string }[] = [
  { id: "all", label: "Fresh matches", helper: "Everything we think you’ll love" },
  { id: "under100", label: "Under £100", helper: "Budget-friendly picks" },
  { id: "performance", label: "Performance", helper: "Brakes, intakes, tunes" },
  { id: "interior", label: "Interior", helper: "Seats, trim, infotainment" },
  { id: "exterior", label: "Exterior", helper: "Lighting, aero, styling" },
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

  const filteredListings = useMemo(
    () => listings.filter((listing) => matchesFilter(listing, activeFilter)),
    [listings, activeFilter]
  );

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
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shadow ${
              activeFilter === filter.id
                ? "bg-yellow-400 text-black shadow-yellow-200"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            aria-pressed={activeFilter === filter.id}
          >
            {filter.label}
            <span className="block text-[11px] font-normal text-gray-500">
              {filter.helper}
            </span>
          </button>
        ))}
      </div>

      {quickAddError && <div className="text-xs text-red-600">{quickAddError}</div>}

      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
        {filteredListings.length === 0 ? (
          <div className="text-sm text-gray-600 py-4">
            Nothing in this filter yet. Try another chip above.
          </div>
        ) : (
          filteredListings.map((p) => (
            <article
              key={p.id}
              data-listing-card={String(p.id)}
              className="min-w-[230px] max-w-[260px] snap-start rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <Link href={`/listing/${p.id}`} className="block relative aspect-[4/3] overflow-hidden rounded-t-2xl">
                <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] uppercase tracking-widest">
                  <Sparkles size={12} />
                  Suggested
                </div>
              </Link>
              <div className="p-3 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{p.title}</h3>
                  <div className="mt-1 text-base font-bold text-gray-900">{p.price}</div>
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
          ))
        )}
      </div>
    </div>
  );
}
