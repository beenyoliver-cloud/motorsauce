"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search as SearchIcon, Zap } from "lucide-react";
import { nsKey } from "@/lib/auth";
import { manualVehicleMakes, manualVehicleModels, getYearsForModel } from "@/data/manualVehicleOptions";

export default function HomeHero() {
  const router = useRouter();
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
  // Get valid years for the selected make/model
  const manualYearOptions = useMemo(() => {
    if (manualMake && manualModel) {
      return getYearsForModel(manualMake, manualModel);
    }
    // Default to last 40 years if no model selected
    const thisYear = new Date().getFullYear();
    return Array.from({ length: 40 }, (_, i) => thisYear - i);
  }, [manualMake, manualModel]);

  const persistLastLookup = (payload: { make?: string; model?: string; year?: number; trim?: string; reg?: string }) => {
    try {
      const key = nsKey("last_dvla_lookup");
      localStorage.setItem(
        key,
        JSON.stringify({
          ...payload,
          at: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
  };

  function resetManualFallback() {
    setShowManualFallback(false);
    setManualMake("");
    setManualModel("");
    setManualYear("");
    setFallbackMessage("");
  }

  async function submitPlateSearch() {
    const reg = plate.trim().toUpperCase().replace(/\s/g, ''); // Remove all spaces
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
      if (!res.ok) {
        throw new Error(data?.error || "Lookup failed");
      }

      const makeVal = typeof data.make === "string" ? data.make.trim() : "";
      const modelVal = typeof data.model === "string" ? data.model.trim() : "";
      const yearVal =
        typeof data.year === "number" && Number.isFinite(data.year) ? data.year : undefined;

      // Persist last successful lookup to help My Garage prefill
      persistLastLookup({
        make: makeVal,
        model: modelVal,
        year: yearVal,
        trim: data.trim,
        reg,
      });

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
      router.push(`/search${params.toString() ? '?' + params.toString() : ''}`);
    } catch (e: any) {
      setPlateError(null);
      setFallbackMessage("Add your vehicle details so we can finish matching.");
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
    persistLastLookup({
      make: manualMake,
      model: manualModel,
      year: manualYear ? Number(manualYear) : undefined,
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-900/10 bg-slate-900 text-white p-4 sm:p-6 md:p-8 shadow-xl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="home-hero-gradient" />
        <div className="home-hero-orbit home-hero-orbit--one" />
        <div className="home-hero-orbit home-hero-orbit--two" />
        <div className="home-hero-ghost-car" />
      </div>

      <div className="relative max-w-4xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
          <Zap className="h-3.5 w-3.5 text-yellow-300" />
          Live vehicle-matching
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-[0_8px_25px_rgba(0,0,0,0.35)]">
          Find the right part for your ride faster than your pit crew.
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl">
          Drop a UK registration and we’ll auto-fill the make and year, then prompt you to add the exact model so we only surface parts that fit.
        </p>

        <div className="mt-2 sm:mt-3 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div
            className={`grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 rounded-2xl border border-white/10 bg-white/90 p-3 md:p-4 shadow-2xl backdrop-blur ${
              plateFocused ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-yellow-300" : ""
            }`}
          >
            <label className="text-xs font-semibold text-gray-800 md:pr-2">Search by registration</label>
            <div className="flex flex-col items-center justify-center w-full">
              <div
                className={`relative flex w-full max-w-[480px] items-stretch rounded-lg border-2 border-[#1c1b18] bg-[#F9D548] shadow-[0_14px_22px_rgba(0,0,0,0.35)] transition-all duration-300 min-h-[64px] sm:min-h-[78px] ${
                  plateFocused ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-yellow-200/60" : ""
                }`}
              >
                <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-2 sm:px-3 py-2 sm:py-3 rounded-l-md border-r-2 border-[#1c1b18] min-w-[44px] sm:min-w-[50px]">
                  <span className="text-[10px] font-semibold">🇬🇧</span>
                  <span className="text-[9px] sm:text-[10px] font-semibold tracking-tight -mt-0.5">UK</span>
                </div>
                <input
                  value={plate}
                  onFocus={() => setPlateFocused(true)}
                  onBlur={() => setPlateFocused(false)}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitPlateSearch();
                    }
                  }}
                  placeholder="AB12 CDE"
                  className="flex-1 bg-transparent text-black placeholder:text-black/40 px-4 sm:px-6 text-[1.4rem] sm:text-[1.9rem] uppercase tracking-[0.18em] focus:outline-none font-semibold text-center caret-black"
                  style={{
                    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitPlateSearch}
              disabled={plateLoading}
              className="justify-self-start md:justify-self-end inline-flex items-center gap-1.5 rounded-md bg-yellow-300 text-slate-900 font-semibold px-4 py-2.5 text-sm hover:bg-yellow-200 disabled:opacity-50 transition-all"
            >
              {plateLoading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full" />
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
              <div className="md:col-span-3 text-xs text-red-100 bg-red-600/80 border border-red-400 rounded-md px-3 py-2">
                {plateError}
              </div>
            )}
          </div>

          {showManualFallback && (
            <div className="mt-3 rounded-2xl border border-yellow-200/70 bg-yellow-50 p-4 space-y-3 text-sm text-yellow-900 shadow-lg">
              <p className="font-semibold text-base">
                {fallbackMessage || "Tell us what you're driving so we can tailor the results."}
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
                  className="inline-flex items-center justify-center rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 transition"
                >
                  Continue with these details
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="inline-flex items-center justify-center rounded-md border border-yellow-300 text-yellow-900 px-4 py-2 hover:border-yellow-400 transition bg-white"
                >
                  Browse all parts
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm text-white/80">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
              Instant DVLA lookup
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden />
              Manual fallback ready
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-200" aria-hidden />
              Filters autopopulated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
