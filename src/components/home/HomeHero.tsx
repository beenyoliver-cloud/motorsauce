"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

  function resetManualFallback() {
    setShowManualFallback(false);
    setManualMake("");
    setManualModel("");
    setManualYear("");
    setFallbackMessage("");
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
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-slate-900 p-3 sm:p-5 shadow-sm max-w-5xl mx-auto mt-1 sm:mt-4">
      <div className="space-y-2 sm:space-y-3 relative">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-600">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            Vehicle compatibility
          </div>
          <div className="text-xs font-semibold text-gray-600">eBay-inspired layout • Keep all features</div>
        </div>
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">Find parts that fit your car—fast.</h1>
        <p className="text-xs sm:text-sm text-gray-600 break-words sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
          Enter your UK registration to filter listings by compatibility.
        </p>

        <form
          className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            submitPlateSearch();
          }}
        >
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 sm:pr-2">Registration lookup</label>
          <div className="flex flex-col items-center justify-center w-full">
            <div
              className={`relative flex w-full max-w-[900px] items-stretch rounded-md border border-gray-300 bg-white shadow-sm transition-all duration-200 min-h-[46px] ${
                plateFocused ? "ring-2 ring-blue-200 border-blue-500" : ""
              }`}
            >
              <div className="flex flex-col items-center justify-center bg-[#0064d2] text-white px-3 py-1.5 rounded-l-md border-r border-gray-200 min-w-[46px]">
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
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0064d2] text-white font-semibold px-4 py-2 text-sm hover:bg-[#0056b3] disabled:opacity-50 transition-all"
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
