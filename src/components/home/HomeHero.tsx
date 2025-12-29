"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Zap, Flame, ShieldCheck, Sparkles, Layers, ShoppingBag } from "lucide-react";
import { nsKey } from "@/lib/auth";
import { manualVehicleMakes, manualVehicleModels, getYearsForModel } from "@/data/manualVehicleOptions";

export default function HomeHero() {
  const router = useRouter();
  const sp = useSearchParams();
  const [heroTab, setHeroTab] = useState<"parts" | "sellers">("parts");
  const [keyword, setKeyword] = useState("");
  const [plate, setPlate] = useState("");
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateFocused, setPlateFocused] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualMake, setManualMake] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");

  const manualModelOptions = useMemo(
    () => (manualMake && manualVehicleModels[manualMake] ? manualVehicleModels[manualMake] : []),
    [manualMake]
  );

  const manualYearOptions = useMemo(() => {
    if (manualMake && manualModel) return getYearsForModel(manualMake, manualModel);
    const thisYear = new Date().getFullYear();
    return Array.from({ length: 40 }, (_, i) => thisYear - i);
  }, [manualMake, manualModel]);

  const persistLastLookup = (payload: { make?: string; model?: string; year?: number; trim?: string; reg?: string }) => {
    try {
      const key = nsKey("last_dvla_lookup");
      localStorage.setItem(key, JSON.stringify({ ...payload, at: Date.now() }));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const tab = sp.get("tab");
    if (tab === "sellers") setHeroTab("sellers");
  }, [sp]);

  function resetManualFallback() {
    setShowManualFallback(false);
    setManualMake("");
    setManualModel("");
    setManualYear("");
    setFallbackMessage("");
  }

  function submitKeywordSearch(target?: { q?: string; priceMax?: number; tabOverride?: "parts" | "sellers" }) {
    const resolvedTab = target?.tabOverride ?? heroTab;
    const q = target?.q ?? keyword.trim();
    const params = new URLSearchParams();
    if (q) params.set(resolvedTab === "sellers" ? "seller" : "q", q);
    if (resolvedTab === "sellers") params.set("tab", "sellers");
    if (typeof target?.priceMax === "number") params.set("priceMax", String(target.priceMax));
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function submitPlateSearch() {
    const reg = plate.trim().toUpperCase().replace(/\s/g, "");
    setPlateError(null);
    if (!reg) {
      setPlateError("Enter a registration");
      return;
    }
    resetManualFallback();
    setPlateLoading(true);
    try {
      const res = await fetch(`/api/garage/registration-lookup?reg=${encodeURIComponent(reg)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lookup failed");

      const makeVal = typeof data.make === "string" ? data.make.trim() : "";
      const modelVal = typeof data.model === "string" ? data.model.trim() : "";
      const yearVal = typeof data.year === "number" && Number.isFinite(data.year) ? data.year : undefined;

      persistLastLookup({ make: makeVal, model: modelVal, year: yearVal, trim: data.trim, reg });

      if (!modelVal) {
        setManualMake(makeVal);
        setManualModel("");
        setManualYear(yearVal ? String(yearVal) : "");
        setFallbackMessage(
          makeVal
            ? `Select your ${makeVal} model to finish matching.`
            : "Pick your exact model so we can finish matching your vehicle."
        );
        setShowManualFallback(true);
        return;
      }

      const params = new URLSearchParams();
      if (makeVal) params.set("make", makeVal);
      if (modelVal) params.set("model", modelVal);
      if (yearVal) {
        params.set("yearMin", String(yearVal));
        params.set("yearMax", String(yearVal));
      }
      setPlate("");
      router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
    } catch (e) {
      console.error(e);
      setPlateError("Lookup failed. Try manual entry.");
      setShowManualFallback(true);
    } finally {
      setPlateLoading(false);
    }
  }

  function submitManualVehicle() {
    if (!manualMake || !manualModel) {
      setPlateError("Choose a make and model to continue.");
      return;
    }
    const params = new URLSearchParams();
    params.set("make", manualMake);
    params.set("model", manualModel);
    if (manualYear) {
      params.set("yearMin", manualYear);
      params.set("yearMax", manualYear);
    }
    persistLastLookup({ make: manualMake, model: manualModel, year: manualYear ? Number(manualYear) : undefined });
    setPlate("");
    resetManualFallback();
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-slate-900 p-4 sm:p-5 shadow-sm max-w-5xl mx-auto mt-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-8 h-48 w-48 bg-gradient-to-br from-yellow-300/70 via-amber-200/40 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 -left-12 h-56 w-56 rotate-6 bg-gradient-to-tr from-gray-900/10 via-yellow-500/30 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_60%)]" />
      </div>
      <div className="space-y-4 relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-600">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            Marketplace launchpad
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Payment protected • Seller verified
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Shop smarter. Sell faster.</h1>
            <p className="text-sm text-gray-600 mt-1">
              Search parts or sellers, then narrow by your vehicle or price. Post your part in seconds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/sell")}
              className="inline-flex items-center gap-2 rounded-full bg-yellow-500 text-black px-4 py-2 font-semibold text-sm hover:bg-yellow-600 transition"
            >
              <ShoppingBag className="h-4 w-4" />
              Post your part
            </button>
            <button
              type="button"
              onClick={() => router.push("/categories")}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 hover:border-yellow-400 transition"
            >
              Browse categories
            </button>
          </div>
        </div>

        {/* Marketplace search */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            {(["parts", "sellers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setHeroTab(tab)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  heroTab === tab
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {tab === "parts" ? <Layers className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {tab === "parts" ? "Parts" : "Sellers"}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitKeywordSearch();
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-3 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.04)]">
                <SearchIcon className="h-5 w-5 text-gray-700" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={heroTab === "sellers" ? "Search sellers by name" : "Search parts, OEM, brand, or keyword"}
                  className="flex-1 bg-transparent text-base text-gray-900 placeholder:text-gray-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-black transition"
              >
                <SearchIcon className="h-4 w-4" />
                Go
              </button>
              <button
                type="button"
                onClick={() => submitKeywordSearch({ q: "", priceMax: 20, tabOverride: "parts" })}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:border-yellow-400 transition"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                Under £20
              </button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2 text-xs text-gray-700">
            {[
              { label: "OEM", q: "OEM", icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> },
              { label: "Tools", q: "tool kit", icon: <Layers className="h-3.5 w-3.5 text-blue-600" /> },
              { label: "New Today", q: "new", icon: <Sparkles className="h-3.5 w-3.5 text-yellow-600" /> },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => submitKeywordSearch({ q: chip.q })}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold hover:border-yellow-400 hover:bg-white transition"
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-600">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            Vehicle compatibility
          </div>
          <p className="text-sm text-gray-600 break-words sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Enter your UK registration to filter listings by compatibility.
          </p>
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="justify-self-end text-xs text-gray-700 underline decoration-yellow-500 underline-offset-4"
          >
            Browse without a reg →
          </button>
        </div>

        <form
          className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            submitPlateSearch();
          }}
        >
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 sm:pr-2">Registration lookup</label>
          <div className="flex flex-col items-center justify-center w-full">
            <div
              className={`relative flex w-full max-w-[420px] sm:max-w-[480px] items-stretch rounded-lg border-2 border-[#1c1b18] bg-[#F9D548] shadow-[0_8px_14px_rgba(0,0,0,0.18)] transition-all duration-200 min-h-[46px] ${
                plateFocused ? "ring-2 ring-yellow-200" : ""
              }`}
            >
              <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-2 py-1.5 rounded-l-md border-r-2 border-[#1c1b18] min-w-[40px]">
                <span className="text-[10px] font-semibold">🇬🇧</span>
                <span className="text-[9px] font-semibold tracking-tight -mt-0.5">UK</span>
              </div>
              <input
                value={plate}
                onFocus={() => setPlateFocused(true)}
                onBlur={() => setPlateFocused(false)}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="AB12 CDE"
                className="flex-1 bg-transparent text-black placeholder:text-black/40 px-4 text-[1.15rem] uppercase tracking-[0.15em] focus:outline-none font-semibold text-center caret-black"
                style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={plateLoading}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 text-white font-semibold px-4 py-2 text-sm hover:bg-black disabled:opacity-50 transition-all"
          >
            {plateLoading ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                <span className="text-xs sm:text-sm">Looking up…</span>
              </>
            ) : (
              <>
                <SearchIcon size={16} />
                <span className="text-xs sm:text-sm">Search</span>
              </>
            )}
          </button>
          {plateError && (
            <div className="sm:col-span-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {plateError}
            </div>
          )}
        </form>

        {showManualFallback && (
          <div className="mt-3 rounded-xl border border-yellow-200/70 bg-yellow-50 p-3 space-y-3 text-sm text-yellow-900 shadow-sm">
            <p className="font-semibold text-base">
              {fallbackMessage || "Tell us what you're driving so we can finish matching."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                className="border border-yellow-300 rounded-md px-3 py-2 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                value={manualMake}
                onChange={(e) => {
                  setManualMake(e.target.value);
                  setManualModel("");
                }}
              >
                <option value="">Select make</option>
                {manualVehicleMakes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                className="border border-yellow-300 rounded-md px-3 py-2 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 disabled:bg-gray-100"
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                disabled={!manualMake}
              >
                <option value="">{manualMake ? "Select model" : "Choose make first"}</option>
                {manualModelOptions.map((mm) => (
                  <option key={mm} value={mm}>{mm}</option>
                ))}
              </select>
              <select
                className="border border-yellow-300 rounded-md px-3 py-2 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                value={manualYear}
                onChange={(e) => setManualYear(e.target.value)}
              >
                <option value="">Year (optional)</option>
                {manualYearOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 text-sm">
              <button
                type="button"
                onClick={submitManualVehicle}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 transition"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  resetManualFallback();
                  setPlate("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-yellow-300 text-yellow-900 px-4 py-2 hover:border-yellow-400 transition bg-white"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="inline-flex items-center justify-center gap-2 rounded-md text-yellow-900 px-4 py-2 hover:underline transition"
              >
                Browse all parts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
