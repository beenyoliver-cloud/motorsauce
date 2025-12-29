"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { VEHICLE_DATABASE, getAllMakes, getModelsForMake, getYearsForModel } from "@/data/vehicles";
import { getMainCategories, getSubcategoriesForMain, type MainCategory } from "@/data/partCategories";

type Props = {
  q: string;
  category: string;
  make: string;
  model: string;
  genCode: string;
  engine: string;
  yearMin: number | string;
  yearMax: number | string;
  priceMin: number | string;
  priceMax: number | string;
  makes: string[];
  models: string[];
  genCodes: string[];
  engines: string[];
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const CATEGORIES: Array<"OEM" | "Aftermarket" | "Tool"> = ["OEM", "Aftermarket", "Tool"];
const GARAGE_KEYS = ["ms:garage:favourite", "garage:favourite", "ms_garage_favourite", "garage_favourite"] as const;

function readFavouriteGarage():
  | { make?: string; model?: string; generation?: string; engine?: string; yearFrom?: number; yearTo?: number }
  | null {
  if (typeof window === "undefined") return null;
  for (const key of GARAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === "object") {
        return {
          make: v.make ?? v.brand,
          model: v.model,
          generation: v.generation ?? v.gen,
          engine: v.engine,
          yearFrom: v.yearFrom ?? v.fromYear,
          yearTo: v.yearTo ?? v.toYear,
        };
      }
    } catch {}
  }
  return null;
}

export default function SearchFiltersSidebar(props: Props) {
  const { genCodes, engines, mobileOpen, onMobileClose } = props;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [favouriteGarage, setFavouriteGarage] = useState<ReturnType<typeof readFavouriteGarage>>(null);
  
  const selectedMake = sp.get("make") || "";
  const selectedModel = sp.get("model") || "";
  
  useEffect(() => {
    setFavouriteGarage(readFavouriteGarage());
    const onStorage = () => setFavouriteGarage(readFavouriteGarage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Get available years based on selected model
  const availableYears = useMemo(() => {
    if (selectedMake && selectedModel) {
      return getYearsForModel(selectedMake, selectedModel);
    }
    // Default year range if no model selected
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= 1960; year--) {
      years.push(year);
    }
    return years;
  }, [selectedMake, selectedModel]);

  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    if (sp.get("priceMax")) chips.push(`≤ £${sp.get("priceMax")}`);
    if (sp.get("priceMin")) chips.push(`≥ £${sp.get("priceMin")}`);
    if (sp.get("make")) chips.push(sp.get("make")!);
    if (sp.get("model")) chips.push(sp.get("model")!);
    const conditions = sp.getAll("condition");
    if (conditions.length) chips.push(...conditions);
    if (sp.get("distance")) chips.push(`${sp.get("distance")}km`);
    if (sp.get("category")) chips.push(sp.get("category")!);
    return chips.slice(0, 4);
  }, [sp]);

  function setParam(key: string, value?: string) {
    const params = new URLSearchParams(sp.toString());
    if (value && value.trim() !== "") params.set(key, value.trim());
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setMakeAndResetModel(make?: string) {
    const params = new URLSearchParams(sp.toString());
    if (make && make.trim() !== "") params.set("make", make.trim());
    else params.delete("make");
    // Reset model when make changes
    params.delete("model");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setGenBoth(val?: string) {
    const params = new URLSearchParams(sp.toString());
    if (val && val.trim() !== "") {
      params.set("gen", val.trim());
      params.set("genCode", val.trim());
    } else {
      params.delete("gen");
      params.delete("genCode");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetToFavourite() {
    const fav = readFavouriteGarage();
    const params = new URLSearchParams();
    if (fav?.make) params.set("make", fav.make);
    if (fav?.model) params.set("model", fav.model);
    if (fav?.generation) {
      params.set("gen", fav.generation);
      params.set("genCode", fav.generation);
    }
    if (fav?.engine) params.set("engine", fav.engine);
    if (fav?.yearFrom) params.set("yearMin", String(fav.yearFrom));
    if (fav?.yearTo) params.set("yearMax", String(fav.yearTo));
    router.push(`${pathname}?${params.toString()}`);
    onMobileClose?.();
  }

  function clearAll() {
    router.push(pathname);
    onMobileClose?.();
  }
  // Close mobile drawer when search params change (route change)
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const inputBase =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  const numberBase =
    "rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  // The actual sidebar content (used for both desktop and mobile)
  const Panel = (
    <aside className="md:sticky md:top-6 md:self-start md:w-[300px] md:border-r md:border-gray-200 md:bg-white">
      <div className="p-4 space-y-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
        {/* Search query */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Search</div>
          <input
            defaultValue={sp.get("q") || ""}
            onBlur={(e) => setParam("q", e.target.value)}
            placeholder="Part name, OEM #, keyword…"
            className={inputBase}
          />
        </div>

        {/* Category */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Category</div>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="radio"
                name="category"
                checked={!sp.get("category")}
                onChange={() => setParam("category", "")}
                className="h-4 w-4"
              />
              All categories
            </label>
            {CATEGORIES.map((val) => (
              <label key={val} className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="category"
                  checked={sp.get("category") === val}
                  onChange={() => setParam("category", val)}
                  className="h-4 w-4"
                />
                {val}
              </label>
            ))}
          </div>
        </div>

        {/* Part Type - Main Category and Subcategory */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Part Type</div>
          <div className="space-y-2">
            <select
              value={sp.get("mainCategory") || ""}
              onChange={(e) => {
                setParam("mainCategory", e.target.value);
                // Clear subcategory when main category changes
                if (e.target.value !== sp.get("mainCategory")) {
                  setParam("subcategory", "");
                }
              }}
              className={inputBase}
            >
              <option value="">All categories</option>
              {getMainCategories().map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={sp.get("subcategory") || ""}
              onChange={(e) => setParam("subcategory", e.target.value)}
              className={inputBase}
              disabled={!sp.get("mainCategory")}
            >
              <option value="">{sp.get("mainCategory") ? "All subcategories" : "Select category first"}</option>
              {sp.get("mainCategory") && getSubcategoriesForMain(sp.get("mainCategory") as MainCategory).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Vehicle</div>
          <div className="space-y-2">
            <select
              value={sp.get("make") || ""}
              onChange={(e) => setMakeAndResetModel(e.target.value)}
              className={inputBase}
            >
              <option value="">All makes</option>
              {getAllMakes().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={sp.get("model") || ""}
              onChange={(e) => setParam("model", e.target.value)}
              className={inputBase}
              disabled={!sp.get("make")}
            >
              <option value="">{sp.get("make") ? "All models" : "Select a make first"}</option>
              {sp.get("make") && getModelsForMake(sp.get("make") || "").map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <input
              list="gen-list"
              defaultValue={sp.get("gen") || sp.get("genCode") || ""}
              onBlur={(e) => setGenBoth(e.target.value)}
              placeholder="Generation (e.g. E90)"
              className={inputBase}
            />
            <datalist id="gen-list">
              {genCodes.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>

            <input
              list="engine-list"
              defaultValue={sp.get("engine") || ""}
              onBlur={(e) => setParam("engine", e.target.value)}
              placeholder="Engine (e.g. N52)"
              className={inputBase}
            />
            <datalist id="engine-list">
              {engines.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>

            <label className="flex items-start gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={sp.get("garageOnly") === "1"}
                onChange={(e) => setParam("garageOnly", e.target.checked ? "1" : "")}
                className="h-4 w-4 rounded mt-0.5"
                disabled={!favouriteGarage}
              />
              <span className="flex flex-col leading-tight">
                <span>Only parts for my car</span>
                <span className="text-[11px] text-gray-500">
                  {favouriteGarage
                    ? [favouriteGarage.make, favouriteGarage.model, favouriteGarage.generation].filter(Boolean).join(" ") || "Favourite car"
                    : "Set a favourite car in your garage first"}
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Year range */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Year</div>
          <div className="flex items-center gap-2">
            <select
              value={sp.get("yearMin") || ""}
              onChange={(e) => setParam("yearMin", e.target.value)}
              className={`${inputBase} flex-1`}
            >
              <option value="">From</option>
              {availableYears.map((year) => (
                <option key={`min-${year}`} value={year}>{year}</option>
              ))}
            </select>
            <span className="text-gray-500">–</span>
            <select
              value={sp.get("yearMax") || ""}
              onChange={(e) => setParam("yearMax", e.target.value)}
              className={`${inputBase} flex-1`}
            >
              <option value="">To</option>
              {availableYears.map((year) => (
                <option key={`max-${year}`} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price range */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Price (£)</div>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Min"
              defaultValue={sp.get("priceMin") || ""}
              onBlur={(e) => setParam("priceMin", e.target.value)}
              className={`${numberBase} w-28`}
            />
            <span className="text-gray-500">–</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Max"
              defaultValue={sp.get("priceMax") || ""}
              onBlur={(e) => setParam("priceMax", e.target.value)}
              className={`${numberBase} w-28`}
            />
          </div>
        </div>

        {/* Seller */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Seller</div>
          <input
            defaultValue={sp.get("seller") || ""}
            onBlur={(e) => setParam("seller", e.target.value)}
            placeholder="Search by seller name…"
            className={inputBase}
          />
        </div>

        {/* Location */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Location</div>
          <input
            defaultValue={sp.get("postcode") || ""}
            onBlur={(e) => setParam("postcode", e.target.value)}
            placeholder="Postcode (e.g., SW1A 1AA)"
            className={inputBase}
          />
        </div>

        {/* Shipping Options */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Shipping</div>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={sp.get("delivery") === "true"}
                onChange={(e) => setParam("delivery", e.target.checked ? "true" : "")}
                className="h-4 w-4 rounded"
              />
              Delivery available
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={sp.get("collection") === "true"}
                onChange={(e) => setParam("collection", e.target.checked ? "true" : "")}
                className="h-4 w-4 rounded"
              />
              Collection available
            </label>
          </div>
        </div>

        {/* Returns */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Returns</div>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={sp.get("acceptsReturns") === "true"}
              onChange={(e) => setParam("acceptsReturns", e.target.checked ? "true" : "")}
              className="h-4 w-4 rounded"
            />
            Accepts returns
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={resetToFavourite}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
          >
            Reset to favourite
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
          >
            Clear all
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: render sidebar as a normal grid column, sticky inside (no overlap with footer) */}
      <div className="hidden md:block">{Panel}</div>

      {/* Mobile drawer - full height with scroll */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} aria-hidden />
          <div className="absolute top-0 left-0 h-full w-full bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <div>
                <span className="font-semibold text-gray-900">Filters</span>
                {summaryChips.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {summaryChips.map((chip) => (
                      <span key={chip} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onMobileClose}
                className="p-1 text-gray-500 hover:text-gray-900"
                aria-label="Close filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {Panel}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
