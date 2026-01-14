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

  type DraftFilters = {
    q: string;
    category: string;
    mainCategory: string;
    subcategory: string;
    make: string;
    model: string;
    gen: string;
    engine: string;
    yearMin: string;
    yearMax: string;
    priceMin: string;
    priceMax: string;
    seller: string;
    postcode: string;
    delivery: boolean;
    collection: boolean;
    acceptsReturns: boolean;
    garageOnly: boolean;
  };

  const buildDraft = (): DraftFilters => ({
    q: sp.get("q") || sp.get("query") || "",
    category: sp.get("category") || "",
    mainCategory: sp.get("mainCategory") || "",
    subcategory: sp.get("subcategory") || "",
    make: sp.get("make") || "",
    model: sp.get("model") || "",
    gen: sp.get("gen") || sp.get("genCode") || "",
    engine: sp.get("engine") || "",
    yearMin: sp.get("yearMin") || "",
    yearMax: sp.get("yearMax") || "",
    priceMin: sp.get("priceMin") || "",
    priceMax: sp.get("priceMax") || "",
    seller: sp.get("seller") || "",
    postcode: sp.get("postcode") || "",
    delivery: sp.get("delivery") === "true",
    collection: sp.get("collection") === "true",
    acceptsReturns: sp.get("acceptsReturns") === "true",
    garageOnly: sp.get("garageOnly") === "1",
  });

  const [draft, setDraft] = useState<DraftFilters>(() => buildDraft());

  useEffect(() => {
    if (!mobileOpen) {
      setDraft(buildDraft());
    }
  }, [sp, mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setDraft(buildDraft());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen]);

  const selectedMake = draft.make;
  const selectedModel = draft.model;
  
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

  const pushParams = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const applyDraft = (next: DraftFilters) => {
    const params = new URLSearchParams(sp.toString());
    const setOrDelete = (key: string, value: string) => {
      if (value && value.trim() !== "") params.set(key, value.trim());
      else params.delete(key);
    };

    setOrDelete("q", next.q);
    params.delete("query");
    setOrDelete("category", next.category);
    setOrDelete("mainCategory", next.mainCategory);
    setOrDelete("subcategory", next.subcategory);
    setOrDelete("make", next.make);
    setOrDelete("model", next.model);
    if (next.gen && next.gen.trim() !== "") {
      params.set("gen", next.gen.trim());
      params.set("genCode", next.gen.trim());
    } else {
      params.delete("gen");
      params.delete("genCode");
    }
    setOrDelete("engine", next.engine);
    setOrDelete("yearMin", next.yearMin);
    setOrDelete("yearMax", next.yearMax);
    setOrDelete("priceMin", next.priceMin);
    setOrDelete("priceMax", next.priceMax);
    setOrDelete("seller", next.seller);
    setOrDelete("postcode", next.postcode);
    if (next.delivery) params.set("delivery", "true");
    else params.delete("delivery");
    if (next.collection) params.set("collection", "true");
    else params.delete("collection");
    if (next.acceptsReturns) params.set("acceptsReturns", "true");
    else params.delete("acceptsReturns");
    if (next.garageOnly) params.set("garageOnly", "1");
    else params.delete("garageOnly");

    params.delete("page");
    pushParams(params);
  };

  const updateDraft = (updates: Partial<DraftFilters>, applyNow = false) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      if (applyNow) applyDraft(next);
      return next;
    });
  };

  function resetToFavourite() {
    const fav = readFavouriteGarage();
    const next: DraftFilters = {
      q: "",
      category: "",
      mainCategory: "",
      subcategory: "",
      make: fav?.make || "",
      model: fav?.model || "",
      gen: fav?.generation || "",
      engine: fav?.engine || "",
      yearMin: fav?.yearFrom ? String(fav.yearFrom) : "",
      yearMax: fav?.yearTo ? String(fav.yearTo) : "",
      priceMin: "",
      priceMax: "",
      seller: "",
      postcode: "",
      delivery: false,
      collection: false,
      acceptsReturns: false,
      garageOnly: false,
    };
    setDraft(next);
    applyDraft(next);
  }

  function clearAll() {
    const next: DraftFilters = {
      q: "",
      category: "",
      mainCategory: "",
      subcategory: "",
      make: "",
      model: "",
      gen: "",
      engine: "",
      yearMin: "",
      yearMax: "",
      priceMin: "",
      priceMax: "",
      seller: "",
      postcode: "",
      delivery: false,
      collection: false,
      acceptsReturns: false,
      garageOnly: false,
    };
    setDraft(next);
    router.push(pathname, { scroll: false });
  }

  const inputBase =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  const numberBase =
    "rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  // The actual sidebar content (used for both desktop and mobile)
  const Panel = (
    <aside className="md:h-full md:w-[300px] md:border-r md:border-gray-200 md:bg-white">
      <div className="p-4 space-y-6 md:h-full md:overflow-y-auto md:overscroll-contain">
        {/* Search query */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Search</div>
          <input
            value={draft.q}
            onChange={(e) => updateDraft({ q: e.target.value })}
            onBlur={(e) => {
              if (!mobileOpen) {
                applyDraft({ ...draft, q: e.target.value });
              }
            }}
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
                  checked={!draft.category}
                  onChange={() => updateDraft({ category: "" }, !mobileOpen)}
                  className="h-4 w-4"
                />
                All categories
              </label>
            {CATEGORIES.map((val) => (
              <label key={val} className="flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="radio"
                  name="category"
                  checked={draft.category === val}
                  onChange={() => updateDraft({ category: val }, !mobileOpen)}
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
              value={draft.mainCategory}
              onChange={(e) => {
                const nextValue = e.target.value;
                const nextDraft = {
                  ...draft,
                  mainCategory: nextValue,
                  subcategory: nextValue !== draft.mainCategory ? "" : draft.subcategory,
                };
                setDraft(nextDraft);
                if (!mobileOpen) applyDraft(nextDraft);
              }}
              className={inputBase}
            >
              <option value="">All categories</option>
              {getMainCategories().map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={draft.subcategory}
              onChange={(e) => updateDraft({ subcategory: e.target.value }, !mobileOpen)}
              className={inputBase}
              disabled={!draft.mainCategory}
            >
              <option value="">{draft.mainCategory ? "All subcategories" : "Select category first"}</option>
              {draft.mainCategory && getSubcategoriesForMain(draft.mainCategory as MainCategory).map((sub) => (
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
              value={draft.make}
              onChange={(e) => {
                const nextDraft = { ...draft, make: e.target.value, model: "" };
                setDraft(nextDraft);
                if (!mobileOpen) applyDraft(nextDraft);
              }}
              className={inputBase}
            >
              <option value="">All makes</option>
              {getAllMakes().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={draft.model}
              onChange={(e) => updateDraft({ model: e.target.value }, !mobileOpen)}
              className={inputBase}
              disabled={!draft.make}
            >
              <option value="">{draft.make ? "All models" : "Select a make first"}</option>
              {draft.make && getModelsForMake(draft.make || "").map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <input
              list="gen-list"
              value={draft.gen}
              onChange={(e) => updateDraft({ gen: e.target.value })}
              onBlur={(e) => {
                if (!mobileOpen) {
                  applyDraft({ ...draft, gen: e.target.value });
                }
              }}
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
              value={draft.engine}
              onChange={(e) => updateDraft({ engine: e.target.value })}
              onBlur={(e) => {
                if (!mobileOpen) {
                  applyDraft({ ...draft, engine: e.target.value });
                }
              }}
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
                checked={draft.garageOnly}
                onChange={(e) => updateDraft({ garageOnly: e.target.checked }, !mobileOpen)}
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
              value={draft.yearMin}
              onChange={(e) => updateDraft({ yearMin: e.target.value }, !mobileOpen)}
              className={`${inputBase} flex-1`}
            >
              <option value="">From</option>
              {availableYears.map((year) => (
                <option key={`min-${year}`} value={year}>{year}</option>
              ))}
            </select>
            <span className="text-gray-500">–</span>
            <select
              value={draft.yearMax}
              onChange={(e) => updateDraft({ yearMax: e.target.value }, !mobileOpen)}
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
              value={draft.priceMin}
              onChange={(e) => updateDraft({ priceMin: e.target.value })}
              onBlur={(e) => {
                if (!mobileOpen) {
                  applyDraft({ ...draft, priceMin: e.target.value });
                }
              }}
              className={`${numberBase} w-28`}
            />
            <span className="text-gray-500">–</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Max"
              value={draft.priceMax}
              onChange={(e) => updateDraft({ priceMax: e.target.value })}
              onBlur={(e) => {
                if (!mobileOpen) {
                  applyDraft({ ...draft, priceMax: e.target.value });
                }
              }}
              className={`${numberBase} w-28`}
            />
          </div>
        </div>

        {/* Seller */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Seller</div>
          <input
            value={draft.seller}
            onChange={(e) => updateDraft({ seller: e.target.value })}
            onBlur={(e) => {
              if (!mobileOpen) {
                applyDraft({ ...draft, seller: e.target.value });
              }
            }}
            placeholder="Search by seller name…"
            className={inputBase}
          />
        </div>

        {/* Location */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Location</div>
          <input
            value={draft.postcode}
            onChange={(e) => updateDraft({ postcode: e.target.value.toUpperCase() })}
            onBlur={(e) => {
              if (!mobileOpen) {
                applyDraft({ ...draft, postcode: e.target.value.toUpperCase() });
              }
            }}
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
                checked={draft.delivery}
                onChange={(e) => updateDraft({ delivery: e.target.checked }, !mobileOpen)}
                className="h-4 w-4 rounded"
              />
              Delivery available
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={draft.collection}
                onChange={(e) => updateDraft({ collection: e.target.checked }, !mobileOpen)}
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
              checked={draft.acceptsReturns}
              onChange={(e) => updateDraft({ acceptsReturns: e.target.checked }, !mobileOpen)}
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
      <div className="hidden md:block md:h-full">{Panel}</div>

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
            <div className="border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  applyDraft(draft);
                  onMobileClose?.();
                }}
                className="w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 transition"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
