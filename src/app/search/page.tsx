"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import SearchFiltersSidebar from "@/components/SearchFiltersSidebar";
import SortControl from "@/components/SortControl";
import TrustBadge from "@/components/TrustBadge";
import SearchTabs from "@/components/SearchTabs";
import SellerCard from "@/components/SellerCard";
import { SearchResultSkeleton, SellerCardSkeleton } from "@/components/skeletons/Skeletons";
import QuickViewModal from "@/components/QuickViewModal";
import Breadcrumb from "@/components/Breadcrumb";
import ActiveFilters from "@/components/ActiveFilters";
import LiveActivityFeed from "@/components/home/LiveActivityFeed";
import { Eye, Heart, ChevronRight, Sparkles, Gauge, MapPin } from "lucide-react";
import { nsKey } from "@/lib/auth";
import SaveSearchButton from "@/components/SaveSearchButton";
import { searchListing, normalizeSearchTerm } from "@/lib/searchHelpers";

/* ---------- Types ---------- */
type Listing = {
  id: string;
  title: string;
  price: string; // "£120" etc.
  image: string;
  images?: string[];
  category: "OEM" | "Aftermarket" | "Tool";
  condition: "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  oem?: string;
  description?: string;
  createdAt: string;
  seller: { name: string; avatar: string; rating: number; county?: string };
  sellerLat?: number;
  sellerLng?: number;
  distanceKm?: number;
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
  main_category?: string;
  part_type?: string;
  viewCount?: number;
  // Multi-vehicle support
  vehicles?: Array<{ make: string; model: string; year?: number; universal?: boolean }>;
};

function arrify(v: string | string[] | null | undefined): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function toNum(v: string | string[] | null | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v || "";
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function priceNumber(price: string | undefined): number {
  if (!price) return 0;
  const n = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
const uniq = (arr: (string | undefined)[]) =>
  Array.from(new Set(arr.filter(Boolean))) as string[];

/* Favourite garage helpers */
const GARAGE_KEYS = [
  "ms:garage:favourite",
  "garage:favourite",
  "ms_garage_favourite",
  "garage_favourite",
] as const;

const WATCH_KEY = "ms:watchlist";

const TRENDING_QUERIES = [
  "coilovers",
  "carbon mirror caps",
  "stage 1 tune",
  "M Performance",
  "brake upgrade",
];

type FavouriteGarage = ReturnType<typeof readFavouriteGarage>;

function matchesFavourite(listing: Listing, fav: FavouriteGarage): boolean {
  if (!fav) return true;
  const normalized = (value?: string) => value?.toLowerCase().trim();
  const favMake = normalized(fav.make);
  const favModel = normalized(fav.model);
  const favGen = normalized(fav.generation);
  const favEngine = normalized(fav.engine);

  const vehicles = Array.isArray(listing.vehicles) && listing.vehicles.length > 0
    ? listing.vehicles
    : [{ make: listing.make, model: listing.model, year: listing.year, universal: false }];

  return vehicles.some((vehicle) => {
    if (!vehicle) return false;
    if (vehicle.universal) return true;
    const makeMatch = favMake ? normalized(vehicle.make) === favMake : true;
    const modelMatch = favModel ? normalized(vehicle.model) === favModel : true;
    const genMatch = favGen ? normalized(listing.genCode) === favGen : true;
    const engineMatch = favEngine ? normalized(listing.engine) === favEngine : true;
    return makeMatch && modelMatch && genMatch && engineMatch;
  });
}

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
    } catch {
      // ignore
    }
  }
  return null;
}

/* ---------- Page ---------- */
function SearchPageInner() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [all, setAll] = useState<Listing[]>([]);
  const [sellers, setSellers] = useState<Array<{ id: string; name: string; avatar: string; rating?: number; listingsCount?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sellersLoading, setSellersLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"parts" | "sellers">("parts");
  const [quickViewListingId, setQuickViewListingId] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const [favouriteGarage, setFavouriteGarage] = useState<FavouriteGarage>(null);
  const [sellerSort, setSellerSort] = useState<"featured" | "rating" | "listings">("featured");

  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateParam = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(sp.toString());
      if (!value) params.delete(key);
      else params.set(key, value);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, sp]
  );

  const toggleWatch = useCallback((id: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((entry) => entry !== id) : [...prev, id];
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  // Auto-apply favourite garage on first load if no filters are set
  useEffect(() => {
    const noFilters =
      !sp.get("q") &&
      !sp.get("category") &&
      !sp.get("make") &&
      !sp.get("model") &&
      !(sp.get("gen") || sp.get("genCode")) &&
      !sp.get("engine") &&
      !sp.get("yearMin") &&
      !sp.get("yearMax") &&
      !sp.get("priceMin") &&
      !sp.get("priceMax");

    if (!noFilters) return;

    const fav = readFavouriteGarage();
    if (!fav) return;

    const next = new URLSearchParams(sp.toString());
    if (fav.make) next.set("make", fav.make);
    if (fav.model) next.set("model", fav.model);
    if (fav.generation) {
      next.set("gen", fav.generation);
      next.set("genCode", fav.generation);
    }
    if (fav.engine) next.set("engine", fav.engine);
    if (fav.yearFrom) next.set("yearMin", String(fav.yearFrom));
    if (fav.yearTo) next.set("yearMax", String(fav.yearTo));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    setFavouriteGarage(readFavouriteGarage());
  }, []);

  /* Fetch all listings (base + local) and calculate distances */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    
    async function loadListingsWithDistance() {
      try {
        // Fetch listings
        const response = await fetch("/api/listings", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load listings");
        const data: Listing[] = await response.json();
        
        if (!alive) return;
        
        // Calculate distances if user has location
        try {
          const { getUserLocation, calculateDistance } = await import("@/lib/distance");
          const userLocation = await getUserLocation();
          
          if (userLocation) {
            const withDistances = data.map(listing => {
              if (listing.sellerLat && listing.sellerLng) {
                const distanceKm = calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  listing.sellerLat,
                  listing.sellerLng
                );
                return { ...listing, distanceKm };
              }
              return listing;
            });
            setAll(withDistances);
          } else {
            setAll(data);
          }
        } catch {
          // If distance calculation fails, just show listings without distance
          setAll(data);
        }
      } catch (e: any) {
        if (alive) setErr(e.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }
    
    loadListingsWithDistance();
    
    return () => {
      alive = false;
    };
  }, []);

  // recent searches (client only)
  useEffect(() => {
    try {
      // Read per-user namespaced key first; fallback to legacy global key
      const key = nsKey("recent_searches");
      const raw = localStorage.getItem(key) || localStorage.getItem("ms:recent-searches");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecent(arr);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setWatchlist(parsed.map(String));
      }
    } catch {
      // ignore
    }
  }, []);

  /* Read live filters from URL */
  const q =
    (sp.get("q") && String(sp.get("q"))) ||
    (sp.get("query") && String(sp.get("query"))) ||
    "";
  
  /* Fetch sellers when query changes or when activeTab is sellers */
  useEffect(() => {
    const query = q.trim();

    let alive = true;
    setSellersLoading(true);
    // Always fetch sellers (with or without query)
    const url = query 
      ? `/api/search/sellers?q=${encodeURIComponent(query)}`
      : `/api/search/sellers`;
    
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to search sellers");
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        setSellers(Array.isArray(data.sellers) ? data.sellers : []);
      })
      .catch(() => alive && setSellers([]))
      .finally(() => alive && setSellersLoading(false));
    return () => {
      alive = false;
    };
  }, [q]);

  const seller = sp.get("seller") || "";

  const categories = arrify(sp.getAll("category"));
  const conditions = arrify(sp.getAll("condition"));
  const makes = arrify(sp.getAll("make"));
  const models = arrify(sp.getAll("model"));
  const genCodes = arrify(sp.getAll("gen").concat(sp.getAll("genCode")));
  const engines = arrify(sp.getAll("engine"));
  const mainCategory = sp.get("mainCategory") || "";
  const subcategory = sp.get("subcategory") || "";
  const garageOnly = sp.get("garageOnly") === "1";
  const universalOnly = sp.get("universalOnly") === "1";

  const yearMin = toNum(sp.get("yearMin"));
  const yearMax = toNum(sp.get("yearMax"));
  const priceMin = toNum(sp.get("priceMin"));
  const priceMax = toNum(sp.get("priceMax"));

  /* Apply filters */
  const results = useMemo(
    () =>
      all.filter((l) => {
        if (categories.length && !categories.includes(l.category)) return false;
        
        // Main category and subcategory filtering
        if (mainCategory && l.main_category !== mainCategory) return false;
        if (subcategory && l.part_type !== subcategory) return false;
        
        // Multi-vehicle filtering with backward compatibility
        if (makes.length) {
          const hasMatch = 
            // Check new vehicles array (multi-vehicle)
            (Array.isArray(l.vehicles) && l.vehicles.some(v => makes.includes(v.make))) ||
            // Fallback to old make field (single vehicle, backward compatibility)
            (l.make && makes.includes(l.make));
          if (!hasMatch) return false;
        }
        
        if (models.length) {
          const hasMatch = 
            // Check new vehicles array (multi-vehicle)
            (Array.isArray(l.vehicles) && l.vehicles.some(v => models.includes(v.model))) ||
            // Fallback to old model field (single vehicle, backward compatibility)
            (l.model && models.includes(l.model));
          if (!hasMatch) return false;
        }
        
        if (genCodes.length && (!l.genCode || !genCodes.includes(l.genCode))) return false;
        if (engines.length && (!l.engine || !engines.includes(l.engine))) return false;

        if (universalOnly) {
          const veh = Array.isArray(l.vehicles) ? l.vehicles : [];
          const hasUniversal = veh.some((v) => v?.universal);
          if (!hasUniversal) return false;
        }

        if (typeof yearMin === "number" && (l.year ?? l.yearFrom ?? 0) < yearMin) return false;
        if (typeof yearMax === "number" && (l.year ?? l.yearTo ?? 9999) > yearMax) return false;

        const p = priceNumber(l.price);
        if (typeof priceMin === "number" && p < priceMin) return false;
        if (typeof priceMax === "number" && p > priceMax) return false;

        if (seller && seller.trim()) {
          const sellerNeedle = seller.toLowerCase().trim();
          const sellerHay = l.seller.name.toLowerCase();
          if (!sellerHay.includes(sellerNeedle)) return false;
        }

        if (q) {
          // Use fuzzy search with typo tolerance
          const normalized = normalizeSearchTerm(q);
          if (!searchListing({
            title: l.title,
            description: l.description,
            oem: l.oem,
            make: l.make,
            model: l.model,
            category: l.category,
            part_type: (l as any).part_type,
            main_category: (l as any).main_category,
          }, normalized)) {
            return false;
          }
        }

        if (garageOnly && favouriteGarage && !matchesFavourite(l, favouriteGarage)) {
          return false;
        }
        return true;
      }),
    [all, categories, mainCategory, subcategory, makes, models, genCodes, engines, yearMin, yearMax, priceMin, priceMax, q, seller, garageOnly, universalOnly, favouriteGarage]
  );

  // Sorting
  const sortKey = sp.get("sort") || "relevance"; // includes nearest
  const sortedResults = useMemo(() => {
    const arr = results.slice();
    if (sortKey === "price_asc") {
      arr.sort((a, b) => priceNumber(a.price) - priceNumber(b.price));
    } else if (sortKey === "price_desc") {
      arr.sort((a, b) => priceNumber(b.price) - priceNumber(a.price));
    } else if (sortKey === "newest") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortKey === "nearest") {
      arr.sort((a, b) => {
        const da = typeof a.distanceKm === "number" ? a.distanceKm : Number.POSITIVE_INFINITY;
        const db = typeof b.distanceKm === "number" ? b.distanceKm : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } // relevance = original order
    return arr;
  }, [results, sortKey]);

  useEffect(() => {
    setVisibleCount(30);
  }, [sortedResults]);

  const visibleResults = sortedResults.slice(0, visibleCount);
  const hasMoreResults = visibleCount < sortedResults.length;

  const sortedSellersList = useMemo(() => {
    if (sellerSort === "rating") {
      return sellers.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    if (sellerSort === "listings") {
      return sellers.slice().sort((a, b) => (b.listingsCount || 0) - (a.listingsCount || 0));
    }
    return sellers;
  }, [sellers, sellerSort]);

  const makeOptions = uniq(all.map((l) => l.make));
  const modelOptions = uniq(all.map((l) => l.model));
  const genOptions = uniq(all.map((l) => l.genCode));
  const engineOptions = uniq(all.map((l) => l.engine));

  return (
    <div className="mx-auto max-w-7xl md:grid md:grid-cols-[300px_1fr]">
      {/* Desktop sidebar column */}
      <SearchFiltersSidebar
        q={q}
        category={categories[0] || ""}
        make={makes[0] || ""}
        model={models[0] || ""}
        genCode={genCodes[0] || ""}
        engine={engines[0] || ""}
        yearMin={yearMin ?? ""}
        yearMax={yearMax ?? ""}
        priceMin={priceMin ?? ""}
        priceMax={priceMax ?? ""}
        makes={makeOptions}
        models={modelOptions}
        genCodes={genOptions}
        engines={engineOptions}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />

      {/* Results column */}
      <section className="pt-6 sm:pt-4">
        {/* Mobile header (no filters button) */}
        <div className="md:hidden mb-2 px-3">
          <h1 className="text-lg font-bold text-black">Search</h1>
        </div>

        <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6">

          {/* Recent searches (mobile only) */}
          {recent.length > 0 && (
            <div className="md:hidden -mt-2 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Recent searches">
              {recent.map(r => (
                <button
                  key={r}
                  onClick={() => {
                    const params = new URLSearchParams(sp.toString());
                    params.set('q', r);
                    window.location.href = `/search?${params.toString()}`;
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setRecent(prev => prev.filter(s => s !== r));
                    try {
                      const key = nsKey('recent_searches');
                      localStorage.setItem(key, JSON.stringify(recent.filter(s => s !== r)));
                    } catch {}
                  }}
                  className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-xs border border-gray-200 whitespace-nowrap hover:bg-gray-200"
                  title="Tap to search • long press to remove"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <SearchTabs
            activeTab={activeTab}
            partsCount={sortedResults.length}
            sellersCount={sellers.length}
            onChange={setActiveTab}
          />

          {/* Horizontal scrollable filter bubbles - Mobile only */}
          <div className="md:hidden -mx-3 sm:-mx-4">
            <div className="flex gap-2 overflow-x-auto px-3 sm:px-4 py-1 scrollbar-hide snap-x snap-mandatory">
              {/* Filters button - first in list */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-black text-white hover:bg-gray-800 snap-start flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>

              {/* Category filters */}
              {["OEM", "Aftermarket", "Tool"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    const params = new URLSearchParams(sp.toString());
                    if (categories.includes(cat)) {
                      params.delete("category");
                    } else {
                      params.set("category", cat);
                    }
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors snap-start ${
                    categories.includes(cat)
                      ? "bg-yellow-500 text-black"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-yellow-400"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* Condition filters */}
              {["New", "Used - Like New", "Used - Good"].map((cond) => (
                <button
                  key={cond}
                  onClick={() => {
                    const params = new URLSearchParams(sp.toString());
                    if (conditions.includes(cond)) {
                      const updated = conditions.filter((c) => c !== cond);
                      params.delete("condition");
                      updated.forEach((c) => params.append("condition", c));
                    } else {
                      params.append("condition", cond);
                    }
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap snap-start ${
                    conditions.includes(cond)
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400"
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters */}
          <ActiveFilters />

          {/* Quick toggles */}
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            {favouriteGarage && (
              <button
                onClick={() => updateParam("garageOnly", garageOnly ? undefined : "1")}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition ${
                  garageOnly ? "border-yellow-500 bg-yellow-100 text-yellow-900 shadow-yellow-200" : "border-gray-300 text-gray-700 hover:border-yellow-400"
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                {garageOnly ? "Showing my garage" : `Only ${favouriteGarage.make || "my car"}`}
              </button>
            )}
            <button
              onClick={() => updateParam("universalOnly", universalOnly ? undefined : "1")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition ${
                universalOnly ? "border-blue-500 bg-blue-50 text-blue-900 shadow-blue-100" : "border-gray-300 text-gray-700 hover:border-blue-400"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Universal fit
            </button>
          </div>

          {/* Summary + sort + save search */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-yellow-50 to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  {activeTab === "sellers" ? "Seller search" : "Parts search"}
                </p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">
                  {activeTab === "sellers"
                    ? `${sellers.length.toLocaleString()} sellers live`
                    : `${sortedResults.length.toLocaleString()} matching parts`}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {q && (
                    <span className="px-3 py-1 rounded-full bg-white border border-gray-200">
                      Query: <strong>{q}</strong>
                    </span>
                  )}
                  {seller && (
                    <span className="px-3 py-1 rounded-full bg-white border border-gray-200">
                      Seller: <strong>{seller}</strong>
                    </span>
                  )}
                  {!q && recent[0] && (
                    <button
                      onClick={() => updateParam("q", recent[0])}
                      className="px-3 py-1 rounded-full bg-black text-white"
                    >
                      Jump back to “{recent[0]}”
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 justify-end">
                {activeTab !== "sellers" && <SaveSearchButton />}
                {activeTab !== "sellers" && (
                  <div className="pt-1">
                    <SortControl />
                  </div>
                )}
                {activeTab === "sellers" && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-white rounded-full border border-gray-200 px-3 py-1.5 shadow-inner">
                    Sort sellers
                    <select
                      value={sellerSort}
                      onChange={(e) => setSellerSort(e.target.value as any)}
                      className="bg-transparent text-sm text-gray-900 focus:outline-none"
                    >
                      <option value="featured">Featured</option>
                      <option value="rating">Highest rating</option>
                      <option value="listings">Most listings</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm h-full">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Trending searches
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Hot right now</span>
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TRENDING_QUERIES.map((term) => (
                  <button
                    key={term}
                    onClick={() => updateParam("q", term)}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-yellow-300 hover:bg-white transition"
                  >
                    {term}
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  </button>
                ))}
              </div>
              {recent.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-black text-white text-xs flex items-center justify-between">
                  <span>Resume “{recent[0]}”</span>
                  <button
                    onClick={() => updateParam("q", recent[0])}
                    className="underline"
                  >
                    Load
                  </button>
                </div>
              )}
            </div>
            <div className="hidden md:flex">
              <LiveActivityFeed />
            </div>
          </div>

          {/* Errors */}
          {err && (
            <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
              {err}
            </div>
          )}

          {/* Seller Results */}
          {activeTab === "sellers" && sortedSellersList.length > 0 && (
            <div className="space-y-4">
              {sortedSellersList.map((seller) => (
                <SellerCard
                  key={seller.id}
                  id={seller.id}
                  name={seller.name}
                  avatar={seller.avatar}
                  rating={seller.rating}
                  listingsCount={seller.listingsCount}
                />
              ))}
            </div>
          )}

          {/* No sellers found */}
          {activeTab === "sellers" && !sellersLoading && sortedSellersList.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-800">
                {q ? `No sellers found matching "${q}".` : "No sellers available."}
              </p>
            </div>
          )}

          {/* Sellers Loading State */}
          {activeTab === "sellers" && sellersLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <SellerCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Parts Results */}
          {activeTab === "parts" && loading ? (
            <SearchResultSkeleton />
          ) : activeTab === "parts" && sortedResults.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-800">No results found. Try removing a filter or searching a different term.</p>
              <div className="mt-4 text-sm text-gray-600">
                Quick tips: search by <em>part name</em>, <em>OEM ref</em>, or <em>make/model/generation</em>.
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {recent.slice(0, 3).map((term) => (
                  <button
                    key={term}
                    onClick={() => updateParam("q", term)}
                    className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-700 hover:border-yellow-400 hover:text-yellow-600"
                  >
                    Try &quot;{term}&quot;
                  </button>
                ))}
                {TRENDING_QUERIES.slice(0, 3).map((term) => (
                  <button
                    key={term}
                    onClick={() => updateParam("q", term)}
                    className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-700 hover:border-yellow-400 hover:text-yellow-600"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "parts" && sortedResults.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 max-[480px]:grid-cols-3 max-[480px]:gap-1.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
                {visibleResults.map((l) => {
                  const watched = watchlist.includes(l.id);
                  return (
                  <div
                    key={l.id}
                    data-listing-card={String(l.id)}
                    className="group relative border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all sm:rounded-xl"
                  >
                  <Link href={`/listing/${l.id}`} className="flex flex-col h-full">
                    <div className="relative w-full aspect-square bg-gray-50 overflow-hidden sm:aspect-[4/3]">
                    <span
                      className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded z-10 sm:top-2 sm:left-2 sm:text-[10px] sm:px-2 ${
                        l.category === "OEM"
                          ? "bg-yellow-500 text-black"
                          : l.category === "Aftermarket"
                          ? "bg-black text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {l.category}
                    </span>
                    {l.distanceKm !== undefined && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded z-10 bg-blue-500 text-white sm:top-2 sm:right-2 sm:px-2 sm:text-[10px]">
                        {l.distanceKm < 1 ? '<1 mi' : l.distanceKm < 10 ? `~${l.distanceKm} mi` : `~${Math.round(l.distanceKm / 5) * 5} mi`}
                      </span>
                    )}
                    <SafeImage
                      src={l.image}
                      alt={l.title}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 px-2 pb-2 pt-2 sm:p-3">
                    <h3 className="text-[13px] leading-snug sm:text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</h3>
                    {l.category !== "Tool" && (
                      <p className="mt-1 text-[10px] text-gray-600 truncate sm:text-[11px]">
                        {l.make} {l.model} {l.genCode} •{" "}
                        {l.year ?? `${l.yearFrom ?? ""}${l.yearFrom || l.yearTo ? "–" : ""}${l.yearTo ?? ""}`} • {l.engine}
                      </p>
                    )}
                    <div className="mt-2 flex flex-col gap-1 sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="hidden sm:flex items-center gap-2">
                        <SafeImage
                          src={l.seller.avatar}
                          alt={l.seller.name}
                          className="h-6 w-6 rounded-full object-cover"
                          loading="lazy"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-900">{l.seller.name}</span>
                          {l.seller.county && (
                            <span className="text-[10px] text-gray-500">{l.seller.county}</span>
                          )}
                        </div>
                        {/* Trust badge placeholder (data to be wired) */}
                        <TrustBadge soldCount={undefined} />
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-bold text-gray-900 sm:text-base">{l.price}</div>
                        <div className="text-[10px] text-gray-500">
                          {typeof l.viewCount === "number" && l.viewCount > 0 ? `${l.viewCount}+ views` : "Fresh listing"}
                          {watched && <span className="ml-1 text-yellow-700 font-semibold">• Watching</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Quick View & Watch Buttons - hidden on mobile */}
                <div className="hidden sm:flex flex-col gap-2 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setQuickViewListingId(l.id);
                    }}
                    className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg"
                    aria-label="Quick view"
                  >
                    <Eye className="h-4 w-4 text-gray-900" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWatch(l.id);
                    }}
                    aria-pressed={watched}
                    className={`p-2 rounded-lg shadow-lg ${watched ? "bg-yellow-500 text-black" : "bg-white/90 text-gray-900 hover:bg-white"}`}
                    aria-label={watched ? "Remove from watchlist" : "Watch listing"}
                  >
                    <Heart className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
              )})}
            </div>
            
            {hasMoreResults && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisibleCount((count) => count + 30)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-900 hover:border-yellow-400 hover:text-yellow-600 transition"
                >
                  Load 30 more results
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
          ) : null}

          {/* Breadcrumbs */}
          <Breadcrumb 
            items={[
              { label: "Search", href: undefined }
            ]}
            className="py-4"
          />
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        listingId={quickViewListingId || ""}
        isOpen={!!quickViewListingId}
        onClose={() => setQuickViewListingId(null)}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading search interface…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
