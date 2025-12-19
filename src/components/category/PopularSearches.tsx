// src/components/category/PopularSearches.tsx
"use client";

import Link from "next/link";
import { TrendingUp, Search } from "lucide-react";

type Props = {
  category: "oem" | "aftermarket" | "tools" | "OEM" | "Aftermarket" | "Tools";
};

// Popular searches by category - these could be fetched from analytics in the future
const POPULAR_BY_CATEGORY: Record<string, Array<{ term: string; count?: number }>> = {
  oem: [
    { term: "E46 brake pads" },
    { term: "Golf MK5 headlight" },
    { term: "BMW N54 injector" },
    { term: "Audi A4 B8 wishbone" },
    { term: "Focus ST intercooler" },
    { term: "Mercedes W204 sensor" },
    { term: "Civic Type R clutch" },
    { term: "VW Caddy door mirror" },
  ],
  aftermarket: [
    { term: "Coilovers BMW E36" },
    { term: "Milltek exhaust Golf" },
    { term: "Induction kit Fiesta ST" },
    { term: "Bilstein dampers" },
    { term: "AP Racing brakes" },
    { term: "Mishimoto radiator" },
    { term: "Sparco bucket seat" },
    { term: "KW V3 coilovers" },
  ],
  tools: [
    { term: "OBD2 scanner" },
    { term: "Torque wrench" },
    { term: "Jack stands" },
    { term: "Battery charger" },
    { term: "Timing tools BMW" },
    { term: "Socket set" },
    { term: "Impact wrench" },
    { term: "Brake bleeder" },
  ],
};

export default function PopularSearches({ category }: Props) {
  const normalizedCategory = category.toLowerCase() as "oem" | "aftermarket" | "tools";
  const searches = POPULAR_BY_CATEGORY[normalizedCategory] || [];

  if (searches.length === 0) return null;

  // Determine the category param for search URL
  const categoryParam = normalizedCategory === "tools" ? "Tools" : normalizedCategory === "oem" ? "OEM" : "Aftermarket";

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-yellow-600" />
        <h2 className="text-xl md:text-2xl font-bold text-black">Popular searches</h2>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={s.term}
            href={`/search?category=${categoryParam}&q=${encodeURIComponent(s.term)}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700 transition-all"
          >
            <Search className="h-3.5 w-3.5 text-gray-400 group-hover:text-yellow-600" />
            {s.term}
          </Link>
        ))}
      </div>
    </section>
  );
}
