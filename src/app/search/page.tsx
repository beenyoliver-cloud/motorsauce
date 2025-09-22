"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import SearchFiltersSidebar from "@/components/SearchFiltersSidebar";

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
export default function SearchPage() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  /* Read live filters from URL */
  const q =
    (sp.get("q") && String(sp.get("q"))) ||
    (sp.get("query") && String(sp.get("query"))) ||
    "";

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

        if (q) {
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
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [all, categories, makes, models, genCodes, engines, yearMin, yearMax, priceMin, priceMax, q]
  );

  const makeOptions = uniq(all.map((l) => l.make));
  const modelOptions = uniq(all.map((l) => l.model));
  const genOptions = uniq(all.map((l) => l.genCode));
  const engineOptions = uniq(all.map((l) => l.engine));

  return (
    <div className="mx-auto max-w-7xl md:grid md:grid-cols-[300px_1fr]">
      {/* Desktop sidebar column (sticky inside component) + mobile drawer controller */}
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

      {/* Results column (no more ml-[320px]) */}
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
          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-black">Search results</h2>
            <p className="mt-1 text-sm text-gray-700">
              {results.length.toLocaleString()} result{results.length === 1 ? "" : "s"}
              {q ? <> • Query: <strong>{q}</strong></> : null}
            </p>
          </div>

          {/* Errors */}
          {err && (
            <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
              {err}
            </div>
          )}

          {/* Loading / Results */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
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
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-800">No results found. Try removing a filter or searching a different term.</p>
              <div className="mt-4 text-sm text-gray-600">
                Quick tips: search by <em>part name</em>, <em>OEM ref</em>, or <em>make/model/generation</em>.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((l) => (
                <Link
                  key={l.id}
                  href={`/listing/${l.id}`}
                  className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition"
                >
                  <div className="relative aspect-[4/3] bg-gray-50">
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded ${
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
                      className="absolute inset-0 h-full w-full object-cover"
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
                      </div>
                      <div className="font-bold text-gray-900">{l.price}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-yellow-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">Search</span>
          </div>
        </div>
      </section>
    </div>
  );
}
