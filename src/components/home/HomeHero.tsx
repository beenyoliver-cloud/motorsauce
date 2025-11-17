"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search as SearchIcon, Car, ChevronDown, SlidersHorizontal } from "lucide-react";
import { loadMyCars, vehicleLabel } from "@/lib/garage";
import { VEHICLES } from "@/data/vehicles";

const CATEGORIES = ["OEM", "Aftermarket", "Tool"];
const CONDITIONS = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

export default function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const garage = loadMyCars();
  const active = garage[0];

  // Load vehicle data from garage if available
  useEffect(() => {
    if (active) {
      if (active.make && !make) setMake(active.make);
      if (active.model && !model) setModel(active.model);
      if (active.year && !yearMin) setYearMin(String(active.year));
    }
  }, [active, make, model, yearMin]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (condition) params.set("condition", condition);
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (yearMin) params.set("yearMin", yearMin);
    if (yearMax) params.set("yearMax", yearMax);
    if (priceMax) params.set("priceMax", priceMax);
    
    // Always navigate to search page
    router.push(`/search${params.toString() ? '?' + params.toString() : ''}`);
  }

  const hasActiveFilters = category || condition || make || model || yearMin || yearMax || priceMax;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 md:p-8 transition-all duration-300 hover:shadow-lg hover:border-yellow-300">
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-4xl font-extrabold text-black tracking-tight animate-fadeIn">Find the right part for your ride</h1>
        <p className="mt-2 text-sm md:text-base text-gray-700 animate-fadeIn" style={{ animationDelay: '100ms' }}>OEM and aftermarket parts from trusted sellers. Search by keyword or filter by your vehicle.</p>

        <form onSubmit={submitSearch} className="mt-4 space-y-3 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          {/* Main search bar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 border border-gray-300 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-yellow-400 focus-within:border-yellow-400 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-yellow-300">
              <SearchIcon className="text-gray-400 mr-2 transition-colors duration-300" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts, e.g. coilovers, exhaust…"
                className="flex-1 border-none focus:ring-0 text-[15px] text-gray-900 placeholder:text-gray-500 bg-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 rounded-full px-4 py-2 font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-2 ${
                hasActiveFilters || showFilters
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-yellow-400'
              }`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
            </button>
            <button type="submit" className="shrink-0 rounded-full bg-gray-900 text-white px-4 py-2 font-semibold hover:bg-yellow-500 hover:text-black transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md">Search</button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-fadeIn shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  >
                    <option value="">All categories</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  >
                    <option value="">Any condition</option>
                    {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Price (£)</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="No limit"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  />
                </div>

                {/* Make */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Make</label>
                  <select
                    value={make}
                    onChange={(e) => {
                      setMake(e.target.value);
                      // Reset model when make changes
                      setModel('');
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  >
                    <option value="">All makes</option>
                    {Object.keys(VEHICLES).sort().map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={!make}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All models</option>
                    {make && VEHICLES[make]?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Year Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={yearMin}
                      onChange={(e) => setYearMin(e.target.value)}
                      placeholder="From"
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={yearMax}
                      onChange={(e) => setYearMax(e.target.value)}
                      placeholder="To"
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory('');
                    setCondition('');
                    setMake('');
                    setModel('');
                    setYearMin('');
                    setYearMax('');
                    setPriceMax('');
                  }}
                  className="text-xs text-gray-600 hover:text-yellow-600 underline transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </form>

        {active && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm animate-fadeIn" style={{ animationDelay: '300ms' }}>
            <button
              onClick={(e) => submitSearch(e as unknown as React.FormEvent)}
              className="inline-flex items-center gap-1 rounded-full border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-1 hover:bg-yellow-500 hover:text-white transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            >
              <Car size={14} /> {vehicleLabel(active)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
