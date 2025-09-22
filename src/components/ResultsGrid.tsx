// src/components/ResultsGrid.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import FavoriteButton from "@/components/FavoriteButton";
import { useSearchParams } from "next/navigation";
import { getSelectedCarId, loadMyCars, vehicleLabel } from "@/lib/garage";
import { isListingHidden } from "@/lib/moderationStore";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  images?: string[];
  seller?: { name?: string; avatar?: string; rating?: number };
  category?: string;
  // unknown other fields…
};

export default function ResultsGrid() {
  const sp = useSearchParams();
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const q = (sp.get("q") || "").trim();
  const category = sp.get("category") || "";
  const min = parseFloat(sp.get("min") || "");
  const max = parseFloat(sp.get("max") || "");
  const myCar = sp.get("mycar") === "1";

  // Load once
  useEffect(() => {
    setLoading(true);
    fetch("/api/listings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setAll(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  // Default car text/tokens
  const carTokens = useMemo(() => {
    if (!myCar) return [];
    const id = getSelectedCarId();
    const car = loadMyCars().find((c) => c.id === id) || null;
    if (!car) return [];
    const label = vehicleLabel(car); // e.g., "2018 Audi A3"
    return label.toLowerCase().split(/\s+/).filter(Boolean);
  }, [myCar]);

  // Base filtered results (by query, category, price, my car tokens)
  const results = useMemo(() => {
    let list = all.slice();

    // text query
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter((l) => `${l.title || ""}`.toLowerCase().includes(qq));
    }

    // category
    if (category) {
      list = list.filter((l) => (l.category || "").toLowerCase() === category.toLowerCase());
    }

    // price
    if (!Number.isNaN(min)) {
      list = list.filter((l) => num(l.price) >= min);
    }
    if (!Number.isNaN(max)) {
      list = list.filter((l) => num(l.price) <= max);
    }

    // my car tokens (basic local relevance)
    if (carTokens.length) {
      list = list.filter((l) => {
        const hay = `${l.title || ""}`.toLowerCase();
        return carTokens.some((t) => hay.includes(t));
      });
    }

    return list;
  }, [all, q, category, min, max, carTokens]);

  // Hide reported listings (per-user/device)
  const visible = useMemo(() => {
    if (!results.length) return results;
    // moderationStore.isListingHidden uses localStorage; safe in client component
    return results.filter((l) => !isListingHidden(String(l.id)));
  }, [results]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No matches at all
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
        No results{myCar ? " for your car" : ""}. Try adjusting your filters.
      </div>
    );
  }

  // All matches hidden by user reports
  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
        All results are hidden based on your reports.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {visible.map((l) => (
        <Link
          key={String(l.id)}
          href={`/listing/${l.id}`}
          className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition"
        >
          <div className="relative aspect-[4/3] bg-gray-50">
            <SafeImage src={l.image} alt={l.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</h3>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-base font-bold text-gray-900">{l.price}</div>
              <FavoriteButton listingId={String(l.id)} showLabel={false} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function num(price: string | number | undefined) {
  if (typeof price === "number") return price;
  const s = String(price || "").replace(/[^\d.]+/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
