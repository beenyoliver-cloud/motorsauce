"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search as SearchIcon, Car } from "lucide-react";
import { loadMyCars, vehicleLabel } from "@/lib/garage";

export default function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const garage = loadMyCars();
  const active = garage[0];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q && !active) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (active) {
      if (active.make) params.set("make", active.make);
      if (active.model) params.set("model", active.model);
      if (active.year) params.set("year", String(active.year));
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 md:p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl md:text-4xl font-extrabold text-black tracking-tight">Find the right part for your ride</h1>
        <p className="mt-2 text-sm md:text-base text-gray-700">OEM and aftermarket parts from trusted sellers. Search by keyword or filter by your vehicle.</p>

        <form onSubmit={submitSearch} className="mt-4 flex items-center gap-2">
          <div className="flex items-center w-full border border-gray-300 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-yellow-400 bg-white shadow-sm">
            <SearchIcon className="text-gray-400 mr-2" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts, e.g. coilovers, exhaust…"
              className="flex-1 border-none focus:ring-0 text-[15px] text-gray-900 placeholder:text-gray-500 bg-transparent"
            />
          </div>
          <button type="submit" className="shrink-0 rounded-full bg-gray-900 text-white px-4 py-2 font-semibold hover:bg-black">Search</button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {active ? (
            <button
              onClick={() => submitSearch(new Event("submit") as unknown as React.FormEvent)}
              className="inline-flex items-center gap-1 rounded-full border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-1"
            >
              <Car size={14} /> {vehicleLabel(active)}
            </button>
          ) : (
            <a href="/profile/You?tab=about&edit=1" className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white text-gray-700 px-3 py-1 hover:bg-gray-50">
              <Car size={14} /> Add your vehicle
            </a>
          )}
          <span className="text-xs text-gray-500">Tip: type @username to search sellers</span>
          {/* Trending chips */}
          {/* @ts-ignore */}
          <div className="w-full">
            {/* @ts-ignore */}
            {/* Deliberately keep client-only */}
            <>{require("./TrendingChips").default()}</>
          </div>
        </div>
      </div>
    </div>
  );
}
