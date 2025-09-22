"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

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
  const { makes, models, genCodes, engines, mobileOpen, onMobileClose } = props;
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function setParam(key: string, value?: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    if (value && value.trim() !== "") params.set(key, value.trim());
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setGenBoth(val?: string) {
    const params = new URLSearchParams(sp?.toString() || "");
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

  // Close mobile drawer on route change
  useEffect(() => {
    const unsub = () => onMobileClose?.();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const inputBase =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  const numberBase =
    "rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900";

  // The actual sidebar content (used for both desktop and mobile)
  const Panel = (
    <aside className="md:sticky md:top-[55px] md:w-[300px] md:max-h-[calc(100vh-55px)] md:overflow-y-auto md:border-r md:border-gray-200 md:bg-white">
      <div className="p-4 space-y-6">
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

        {/* Vehicle */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Vehicle</div>
          <div className="space-y-2">
            <input
              list="make-list"
              defaultValue={sp.get("make") || ""}
              onBlur={(e) => setParam("make", e.target.value)}
              placeholder="Make (e.g. BMW)"
              className={inputBase}
            />
            <datalist id="make-list">
              {makes.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            <input
              list="model-list"
              defaultValue={sp.get("model") || ""}
              onBlur={(e) => setParam("model", e.target.value)}
              placeholder="Model (e.g. 3 Series)"
              className={inputBase}
            />
            <datalist id="model-list">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

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
          </div>
        </div>

        {/* Year range */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Year</div>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="From"
              defaultValue={sp.get("yearMin") || ""}
              onBlur={(e) => setParam("yearMin", e.target.value)}
              className={`${numberBase} w-28`}
            />
            <span className="text-gray-500">–</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="To"
              defaultValue={sp.get("yearMax") || ""}
              onBlur={(e) => setParam("yearMax", e.target.value)}
              className={`${numberBase} w-28`}
            />
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

      {/* Mobile drawer (unchanged) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} aria-hidden />
          <div className="absolute top-0 left-0 h-full w-[86%] bg-white shadow-xl">
            {Panel}
          </div>
        </div>
      )}
    </>
  );
}
