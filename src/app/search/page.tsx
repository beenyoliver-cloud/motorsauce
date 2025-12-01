"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { nsKey } from "@/lib/auth";
import SaveSearchButton from "@/components/SaveSearchButton";

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
  seller: { name: string; avatar: string; rating: number };
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
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

  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  /* Fetch all listings (base + local) */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch("/api/listings", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json())?.error || "Failed to load listings");
        return r.json();
      })
      .then((data: Listing[]) => {
        if (!alive) return;
        setAll(Array.isArray(data) ? data : []);
      })
      .catch((e) => alive && setErr(e.message || "Failed to load"))
      .finally(() => alive && setLoading(false));
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
  const makes = arrify(sp.getAll("make"));
  const models = arrify(sp.getAll("model"));
  const genCodes = arrify(sp.getAll("gen").concat(sp.getAll("genCode")));
  const engines = arrify(sp.getAll("engine"));

  const yearMin = toNum(sp.get("yearMin"));
  const yearMax = toNum(sp.get("yearMax"));
  const priceMin = toNum(sp.get("priceMin"));
  const priceMax = toNum(sp.get("priceMax"));

  /* Apply filters */
  const results = useMemo(
    () =>
      all.filter((l) => {
        if (categories.length && !categories.includes(l.category)) return false;
        if (makes.length && (!l.make || !makes.includes(l.make))) return false;
        if (models.length && (!l.model || !models.includes(l.model))) return false;
        if (genCodes.length && (!l.genCode || !genCodes.includes(l.genCode))) return false;
        if (engines.length && (!l.engine || !engines.includes(l.engine))) return false;

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
          const needle = q.toLowerCase().trim();
          const hay = [
            l.title,
            l.description ?? "",
            l.category,
            l.condition,
            l.make ?? "",
            l.model ?? "",
            l.genCode ?? "",
            l.engine ?? "",
            l.oem ?? "",
            String(l.yearFrom ?? ""),
            String(l.yearTo ?? ""),
            String(l.year ?? ""),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      }),
    [all, categories, makes, models, genCodes, engines, yearMin, yearMax, priceMin, priceMax, q, seller]
  );

  // Sorting
  const sortKey = sp.get("sort") || "relevance"; // relevance | price_asc | price_desc | newest
  const sortedResults = useMemo(() => {
    const arr = results.slice();
    if (sortKey === "price_asc") {
      arr.sort((a, b) => priceNumber(a.price) - priceNumber(b.price));
    } else if (sortKey === "price_desc") {
      arr.sort((a, b) => priceNumber(b.price) - priceNumber(a.price));
    } else if (sortKey === "newest") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } // relevance = original order
    return arr;
  }, [results, sortKey]);

  // Pagination
  const ITEMS_PER_PAGE = 50;
  const currentPage = toNum(sp.get("page")) || 1;
  const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  function goToPage(page: number) {
    const params = new URLSearchParams(sp.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  }

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
      <section className="pt-4">
        {/* Mobile toolbar */}
        <div className="md:hidden mb-3 flex items-center justify-between px-4">
          <h1 className="text-xl font-bold text-black">Search</h1>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
          >
            Filters
          </button>
        </div>

        <div className="space-y-6 px-4 md:px-6">

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

          {/* Active Filters */}
          <ActiveFilters />

          {/* Summary + sort + save search */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {activeTab === "sellers" ? "Sellers" : "Parts"}
                </h2>
                <p className="mt-1 text-sm text-gray-700">
                  {activeTab === "sellers" 
                    ? `${sellers.length.toLocaleString()} seller${sellers.length === 1 ? "" : "s"}`
                    : `${sortedResults.length.toLocaleString()} part${sortedResults.length === 1 ? "" : "s"}`
                  }
                  {q ? (
                    <> • Query: <strong>{q}</strong></>
                  ) : null}
                  {seller ? (
                    <> • Seller: <strong>{seller}</strong></>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeTab !== "sellers" && <SaveSearchButton />}
                {activeTab !== "sellers" && (
                  <div className="pt-1">
                    <SortControl />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Errors */}
          {err && (
            <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
              {err}
            </div>
          )}

          {/* Seller Results */}
          {activeTab === "sellers" && sellers.length > 0 && (
            <div className="space-y-4">
              {sellers.map((seller) => (
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
          {activeTab === "sellers" && !sellersLoading && sellers.length === 0 && (
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
            </div>
          ) : activeTab === "parts" && sortedResults.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedResults.map((l) => (
                  <div
                    key={l.id}
                    className="group relative border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all"
                  >
                  <Link href={`/listing/${l.id}`} className="block">
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded z-10 ${
                        l.category === "OEM"
                          ? "bg-yellow-500 text-black"
                          : l.category === "Aftermarket"
                          ? "bg-black text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {l.category}
                    </span>
                    <SafeImage
                      src={l.image}
                      alt={l.title}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</h3>
                    {l.category !== "Tool" && (
                      <p className="mt-1 text-[11px] text-gray-700 truncate">
                        {l.make} {l.model} {l.genCode} •{" "}
                        {l.year ?? `${l.yearFrom ?? ""}${l.yearFrom || l.yearTo ? "–" : ""}${l.yearTo ?? ""}`} • {l.engine}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SafeImage
                          src={l.seller.avatar}
                          alt={l.seller.name}
                          className="h-6 w-6 rounded-full object-cover"
                          loading="lazy"
                        />
                        <span className="text-xs text-gray-900">{l.seller.name}</span>
                        {/* Trust badge placeholder (data to be wired) */}
                        <TrustBadge soldCount={undefined} />
                      </div>
                      <div className="font-bold text-gray-900">{l.price}</div>
                    </div>
                  </div>
                </Link>
                
                {/* Quick View Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setQuickViewListingId(l.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg"
                  aria-label="Quick view"
                >
                  <Eye className="h-4 w-4 text-gray-900" />
                </button>
              </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {/* Show first page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => goToPage(1)}
                          className="w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-2 text-gray-600">...</span>
                        )}
                      </>
                    )}
                    
                    {/* Show pages around current */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        const distance = Math.abs(page - currentPage);
                        return distance <= 2;
                      })
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg border transition-colors ${
                            page === currentPage
                              ? "border-yellow-500 bg-yellow-500 text-white font-semibold"
                              : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    
                    {/* Show last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 text-gray-600">...</span>
                        )}
                        <button
                          onClick={() => goToPage(totalPages)}
                          className="w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedResults.length)} of {sortedResults.length} results
                </div>
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
