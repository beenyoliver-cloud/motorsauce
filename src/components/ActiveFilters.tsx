"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export default function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilters: Array<{ key: string; value: string; label: string }> = [];

  // Query/search term
  const q = searchParams.get("q") || searchParams.get("query");
  if (q) {
    activeFilters.push({ key: "q", value: q, label: `Search: ${q}` });
  }

  // Seller
  const seller = searchParams.get("seller");
  if (seller) {
    activeFilters.push({ key: "seller", value: seller, label: `Seller: ${seller}` });
  }

  // Categories
  const categories = searchParams.getAll("category");
  categories.forEach((cat) => {
    activeFilters.push({ key: "category", value: cat, label: `Category: ${cat}` });
  });

  // Make
  const makes = searchParams.getAll("make");
  makes.forEach((make) => {
    activeFilters.push({ key: "make", value: make, label: `Make: ${make}` });
  });

  // Model
  const models = searchParams.getAll("model");
  models.forEach((model) => {
    activeFilters.push({ key: "model", value: model, label: `Model: ${model}` });
  });

  // Generation
  const gens = searchParams.getAll("gen").concat(searchParams.getAll("genCode"));
  const uniqueGens = Array.from(new Set(gens));
  uniqueGens.forEach((gen) => {
    activeFilters.push({ key: "gen", value: gen, label: `Gen: ${gen}` });
  });

  // Engine
  const engines = searchParams.getAll("engine");
  engines.forEach((engine) => {
    activeFilters.push({ key: "engine", value: engine, label: `Engine: ${engine}` });
  });

  // Year range
  const yearMin = searchParams.get("yearMin");
  const yearMax = searchParams.get("yearMax");
  if (yearMin || yearMax) {
    const label = yearMin && yearMax 
      ? `Year: ${yearMin}-${yearMax}`
      : yearMin 
      ? `Year: ${yearMin}+`
      : `Year: up to ${yearMax}`;
    activeFilters.push({ 
      key: "year", 
      value: "", 
      label,
    });
  }

  // Price range
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  if (priceMin || priceMax) {
    const label = priceMin && priceMax 
      ? `Price: £${priceMin}-£${priceMax}`
      : priceMin 
      ? `Price: £${priceMin}+`
      : `Price: up to £${priceMax}`;
    activeFilters.push({ 
      key: "price", 
      value: "", 
      label,
    });
  }

  function removeFilter(filterKey: string, filterValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle special cases
    if (filterKey === "q") {
      params.delete("q");
      params.delete("query");
    } else if (filterKey === "gen") {
      // Remove from both gen and genCode
      const allGens = params.getAll("gen");
      const allGenCodes = params.getAll("genCode");
      params.delete("gen");
      params.delete("genCode");
      allGens.filter(g => g !== filterValue).forEach(g => params.append("gen", g));
      allGenCodes.filter(g => g !== filterValue).forEach(g => params.append("genCode", g));
    } else if (filterKey === "year") {
      params.delete("yearMin");
      params.delete("yearMax");
    } else if (filterKey === "price") {
      params.delete("priceMin");
      params.delete("priceMax");
    } else {
      // For multi-value filters (category, make, model, engine)
      const allValues = params.getAll(filterKey);
      params.delete(filterKey);
      allValues.filter(v => v !== filterValue).forEach(v => params.append(filterKey, v));
    }

    // Reset to page 1 when filters change
    params.delete("page");
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearAllFilters() {
    router.push(pathname, { scroll: false });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-600 font-medium">Active filters:</span>
      {activeFilters.map((filter, index) => (
        <button
          key={`${filter.key}-${filter.value}-${index}`}
          onClick={() => removeFilter(filter.key, filter.value)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-900 text-xs font-medium transition-colors group"
          title={`Remove filter: ${filter.label}`}
        >
          <span>{filter.label}</span>
          <X className="h-3 w-3 group-hover:text-yellow-700" />
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={clearAllFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
