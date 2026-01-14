"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { loadMyCars } from "@/lib/garage";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
};

type Props = { limit?: number };
const MIN_LISTINGS = 5;
const MIN_ITEMS_PER_FILTER = 5;
const MAX_FILTER_SECTIONS = 3;

type FilterId = "all" | "under100" | "performance" | "interior" | "exterior";

const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Recommended for you" },
  { id: "under100", label: "Budget picks under £100" },
  { id: "performance", label: "Performance upgrades" },
  { id: "interior", label: "Interior refresh" },
  { id: "exterior", label: "Exterior styling" },
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

  const filterSections = useMemo(() => {
    return filters
      .map((filter) => ({
        filter,
        list: listings.filter((listing) => matchesFilter(listing, filter.id)),
      }))
      .filter((entry) => entry.list.length >= MIN_ITEMS_PER_FILTER);
  }, [listings]);

  if (loading) return null;
  if (listings.length < MIN_LISTINGS) return null;

  const visibleSections = filterSections.slice(0, MAX_FILTER_SECTIONS);
  if (visibleSections.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Shop by need</p>
          <h2 className="text-base sm:text-2xl font-bold text-slate-900 leading-tight">
            Choose a path and we'll surface the right parts
          </h2>
        </div>
        <Link href="/search" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0">
          Browse all →
        </Link>
      </div>
      <div className="space-y-8">
        {visibleSections.map(({ filter, list }) => {
          const sectionListings = list.slice(0, 6);

          return (
            <section key={filter.id} className="space-y-2 sm:space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900">{filter.label}</h3>
                <Link
                  href={`/search${filter.id === 'under100' ? '?priceMax=100' : filter.id === 'all' ? '' : `?q=${filter.id}`}`}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                  See all →
                </Link>
              </div>

              {/* Mobile: horizontal scroll, Desktop: fixed grid of 5 */}
              <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
                <div className="flex gap-3 md:grid md:grid-cols-5 md:gap-8">
                  {sectionListings.slice(0, 5).map((p) => (
                    <ListingCard
                      key={`${filter.id}-${p.id}`}
                      id={p.id}
                      title={p.title}
                      price={p.price}
                      image={p.image}
                      className="min-w-[130px] max-w-[145px] sm:min-w-[150px] sm:max-w-[165px] md:min-w-0 md:max-w-none flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
