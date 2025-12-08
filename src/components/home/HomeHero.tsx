"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Search as SearchIcon, Car, ChevronDown, SlidersHorizontal } from "lucide-react";
import { loadMyCars, vehicleLabel } from "@/lib/garage";
import { nsKey } from "@/lib/auth";
import { getAllMakes, getModelsForMake, getYearsForModel } from "@/data/vehicles";

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
  const [plate, setPlate] = useState("");
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  
  const garage = loadMyCars();
  const active = garage[0];

  // Get available years based on selected model
  const availableYears = useMemo(() => {
    if (make && model) {
      return getYearsForModel(make, model);
    }
    // Default year range if no model selected
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= 1960; year--) {
      years.push(year);
    }
    return years;
  }, [make, model]);

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

  async function submitPlateSearch() {
    const reg = plate.trim().toUpperCase().replace(/\s/g, ''); // Remove all spaces
    setPlateError(null);
    if (!reg) {
      setPlateError("Enter a registration");
      return;
    }
    setPlateLoading(true);
    try {
      const res = await fetch(`/api/garage/registration-lookup?reg=${encodeURIComponent(reg)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Lookup failed");
      }

      // Persist last successful lookup to help My Garage prefill
      try {
        const key = nsKey("last_dvla_lookup");
        localStorage.setItem(key, JSON.stringify({
          make: data.make,
          model: data.model,
          year: data.year,
          trim: data.trim,
          at: Date.now(),
          reg,
        }));
      } catch {}

      const params = new URLSearchParams();
      if (data.make) params.set("make", data.make);
      if (data.model) params.set("model", data.model);
      if (typeof data.year === "number" && Number.isFinite(data.year)) {
        params.set("yearMin", String(data.year));
        params.set("yearMax", String(data.year));
      }
      router.push(`/search${params.toString() ? '?' + params.toString() : ''}`);
    } catch (e: any) {
      setPlateError(e?.message || "Registration not found");
    } finally {
      setPlateLoading(false);
    }
  }

  const hasActiveFilters = category || condition || make || model || yearMin || yearMax || priceMax;

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 md:p-8 transition-all duration-300 hover:shadow-lg hover:border-yellow-300">
      <div className="max-w-4xl">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-black tracking-tight animate-fadeIn leading-tight">Find the right part for your ride</h1>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-700 animate-fadeIn" style={{ animationDelay: '100ms' }}>OEM and aftermarket parts from trusted sellers. Search by keyword or filter by your vehicle.</p>

        <form onSubmit={submitSearch} className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          {/* Main search bar - filters button moved to right side on mobile */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center border border-gray-300 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 focus-within:ring-2 focus-within:ring-yellow-400 focus-within:border-yellow-400 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-yellow-300">
              <SearchIcon className="text-gray-400 mr-2 transition-colors duration-300" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts, e.g. coilovers, exhaust…"
                className="w-full border-none focus:ring-0 text-sm sm:text-[15px] text-gray-900 placeholder:text-gray-500 bg-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 font-semibold transition-all duration-300 sm:transform sm:hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-2 text-sm flex-shrink-0 ${
                hasActiveFilters || showFilters
                  ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-yellow-400 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={14} className="sm:size-[16px]" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="bg-black text-white text-xs rounded-full w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center text-[9px] sm:text-xs flex-shrink-0">!</span>}
            </button>
            <button type="submit" className="hidden sm:flex rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-yellow-500 hover:text-black transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md items-center">Search</button>
          </div>

          {/* Advanced filters - NOW APPEARS ABOVE NUMBER PLATE SEARCH */}
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
                      // Reset model and years when make changes
                      setModel('');
                      setYearMin('');
                      setYearMax('');
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                  >
                    <option value="">All makes</option>
                    {getAllMakes().map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      // Reset years when model changes
                      setYearMin('');
                      setYearMax('');
                    }}
                    disabled={!make}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All models</option>
                    {make && getModelsForMake(make).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Year Range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year Range</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={yearMin}
                      onChange={(e) => setYearMin(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                    >
                      <option value="">From</option>
                      {availableYears.map((year) => (
                        <option key={`min-${year}`} value={year}>{year}</option>
                      ))}
                    </select>
                    <span className="text-gray-500">-</span>
                    <select
                      value={yearMax}
                      onChange={(e) => setYearMax(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                    >
                      <option value="">To</option>
                      {availableYears.map((year) => (
                        <option key={`max-${year}`} value={year}>{year}</option>
                      ))}
                    </select>
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

          {/* Number plate search - NOW APPEARS BELOW FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
            <label className="text-xs font-semibold text-gray-700 md:pr-2">Search by registration</label>
            <div className="flex items-center gap-2">
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="AB12 CDE"
                className="flex-1 rounded-md border border-gray-300 bg-[#FFF7CC] text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                style={{ letterSpacing: '0.08em' }}
              />
            </div>
            <button
              type="button"
              onClick={submitPlateSearch}
              disabled={plateLoading}
              className="justify-self-start md:justify-self-end inline-flex items-center gap-1.5 rounded-md bg-yellow-500 text-black font-semibold px-3 py-2 text-sm hover:bg-yellow-600 disabled:opacity-50 transition-all"
            >
              {plateLoading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full" />
                  <span className="text-xs sm:text-sm">Looking up…</span>
                </>
              ) : (
                <>
                  <SearchIcon size={14} />
                  <span className="text-xs sm:text-sm">Search</span>
                </>
              )}
            </button>
            {plateError && (
              <div className="md:col-span-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{plateError}</div>
            )}
          </div>
        </form>

        {active && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm animate-fadeIn" style={{ animationDelay: '300ms' }}>
            <button
              onClick={(e) => submitSearch(e as unknown as React.FormEvent)}
              className="inline-flex items-center gap-1 rounded-full border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-1 hover:bg-yellow-500 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            >
              <Car size={14} /> {vehicleLabel(active)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
