"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, Zap } from "lucide-react";
import { nsKey } from "@/lib/auth";
import { manualVehicleMakes, manualVehicleModels, getYearsForModel } from "@/data/manualVehicleOptions";

type ActivityPreview = {
  id: string;
  type: "listing" | "sale";
  title: string;
  sellerName: string;
  timestamp: string;
  image?: string;
};

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
  const [activityPreview, setActivityPreview] = useState<ActivityPreview[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
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

  const proofMetrics = useMemo(
    () => [
      { value: "1,872", label: "Matches today", detail: "Drivers who dropped a reg in the last 24h" },
      { value: "14,200", label: "Verified sellers", detail: "Performance garages & trusted enthusiasts" },
      { value: "11 min", label: "Avg reply time", detail: "Across the last 50 buyer messages" },
    ],
    []
  );

  const quickSearches = useMemo(
    () => ["M3 coilovers", "Mk7 GTI diff", "911 brake kit", "RS3 intercooler"],
    []
  );

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
      setPlate("");
      router.push(`/search${params.toString() ? '?' + params.toString() : ''}`);
    } catch {
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
    setPlate("");
    resetManualFallback();
    router.push(`/search?${params.toString()}`);
  }

  useEffect(() => {
    let alive = true;
    async function fetchProof() {
      try {
        const res = await fetch("/api/activity?limit=4", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data)) {
          setActivityPreview(data.slice(0, 2));
        }
      } catch {
        if (alive) setActivityPreview([]);
      } finally {
        if (alive) setActivityLoading(false);
      }
    }
    fetchProof();
    return () => {
      alive = false;
    };
  }, []);

  function timeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const handleQuickSearch = (term: string) => {
    const params = new URLSearchParams();
    params.set("q", term);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-900/20 bg-slate-900 text-white p-4 sm:p-5 md:p-6 shadow-lg max-w-5xl mx-auto mt-6 sm:mt-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="home-hero-gradient" />
        <div className="home-hero-orbit home-hero-orbit--one" />
        <div className="home-hero-orbit home-hero-orbit--two" />
      </div>

      <div className="relative max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
          <Zap className="h-3.5 w-3.5 text-yellow-300" />
          Live vehicle-matching
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-[0_8px_25px_rgba(0,0,0,0.35)]">
          Drop your reg and see what&apos;s selling for cars like yours.
        </h1>
        <p className="text-sm sm:text-base text-white/80 max-w-2xl">
          DVLA-powered lookups plus live marketplace data—proof that the parts on this page fit, not just promises.
        </p>

        <div className="relative mt-4 sm:mt-5 animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="absolute inset-0 rounded-3xl bg-white/10 blur-2xl" aria-hidden />
          <div className="relative rounded-3xl bg-white/95 text-slate-900 shadow-2xl ring-4 ring-yellow-200/40 border border-gray-200 p-4 sm:p-5">
            <div
              className={`grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 rounded-2xl border border-black/5 bg-white/90 p-3 md:p-3 shadow-lg ${
                plateFocused ? "ring-2 ring-yellow-300" : ""
              }`}
            >
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 md:pr-2">Search by registration</label>
              <div className="flex flex-col items-center justify-center w-full">
                <div
                  className={`relative flex w-full max-w-[420px] items-stretch rounded-lg border-2 border-[#1c1b18] bg-[#F9D548] shadow-[0_12px_22px_rgba(0,0,0,0.25)] transition-all duration-300 min-h-[52px] sm:min-h-[72px] ${
                    plateFocused ? "scale-[1.01]" : ""
                  }`}
                >
                  <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-2 sm:px-3 py-1.5 sm:py-3 rounded-l-md border-r-2 border-[#1c1b18] min-w-[44px] sm:min-w-[50px]">
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
                    className="flex-1 bg-transparent text-black placeholder:text-black/40 px-4 sm:px-6 text-[1.2rem] sm:text-[1.8rem] uppercase tracking-[0.16em] focus:outline-none font-semibold text-center caret-black"
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
                className="justify-self-start md:justify-self-end inline-flex items-center gap-1.5 rounded-full bg-gray-900 text-white font-semibold px-4 py-2.5 text-sm hover:bg-black disabled:opacity-50 transition-all shadow-lg"
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
                <div className="md:col-span-3 text-xs text-red-700 bg-red-100 border border-red-200 rounded-md px-3 py-2">
                  {plateError}
                </div>
              )}
            </div>

            {showManualFallback && (
              <div className="mt-3 rounded-2xl border border-yellow-200/70 bg-yellow-50 p-3 space-y-3 text-sm text-yellow-900 shadow">
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
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 transition"
                  >
                    Continue with these details
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

            <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" aria-hidden />
                Instant DVLA lookup
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden />
                Manual fallback ready
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden />
                Filters autopopulated
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px]">Try:</span>
              {quickSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:border-yellow-500 hover:text-yellow-700 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {proofMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/15 bg-white/10 px-3 py-3 shadow-sm backdrop-blur">
                <p className="text-lg font-bold text-white">{metric.value}</p>
                <p className="text-xs uppercase tracking-wide text-white/70">{metric.label}</p>
                <p className="text-[11px] text-white/60 mt-1">{metric.detail}</p>
              </div>
            ))}
          </div>
          <div
            className={`grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 rounded-xl border border-white/10 bg-white/90 p-3 md:p-3 shadow-xl backdrop-blur ${
              plateFocused ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-yellow-300" : ""
            }`}
          >
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 md:pr-2">Search by registration</label>
            <div className="flex flex-col items-center justify-center w-full">
              <div
                className={`relative flex w-full max-w-[360px] items-stretch rounded-lg border-2 border-[#1c1b18] bg-[#F9D548] shadow-[0_10px_14px_rgba(0,0,0,0.25)] transition-all duration-300 min-h-[48px] sm:min-h-[64px] ${
                  plateFocused ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-yellow-200/60" : ""
                }`}
              >
                <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-l-md border-r-2 border-[#1c1b18] min-w-[40px] sm:min-w-[46px]">
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
                  className="flex-1 bg-transparent text-black placeholder:text-black/40 px-3 sm:px-5 text-[1rem] sm:text-[1.5rem] uppercase tracking-[0.12em] focus:outline-none font-semibold text-center caret-black"
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
              className="justify-self-start md:justify-self-end inline-flex items-center gap-1.5 rounded-md bg-yellow-300 text-slate-900 font-semibold px-3.5 py-2 text-sm hover:bg-yellow-200 disabled:opacity-50 transition-all"
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
            <div className="mt-3 rounded-xl border border-yellow-200/70 bg-yellow-50 p-3 space-y-3 text-sm text-yellow-900 shadow">
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
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 transition"
                >
                  Continue with these details
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
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent text-yellow-900 px-4 py-2 hover:underline transition"
                >
                  Browse all parts
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {proofMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-white/15 bg-white/10 px-3 py-3 shadow-sm backdrop-blur">
                  <p className="text-lg font-bold text-white">{metric.value}</p>
                  <p className="text-xs uppercase tracking-wide text-white/70">{metric.label}</p>
                  <p className="text-[11px] text-white/60 mt-1">{metric.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Happening now</span>
                </div>
                <Link href="/search" className="text-[11px] text-yellow-200 hover:text-yellow-100 underline decoration-dotted">
                  Browse listings
                </Link>
              </div>
              {activityLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-14 bg-white/10 rounded-lg" />
                  <div className="h-14 bg-white/10 rounded-lg" />
                </div>
              ) : activityPreview.length === 0 ? (
                <p className="text-sm text-white/70">Fresh activity appears here as soon as new parts drop or sell.</p>
              ) : (
                <div className="space-y-2">
                  {activityPreview.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex-1">
                        <p className="text-xs text-white/70">{item.type === "sale" ? "Sold" : "New listing"}</p>
                        <p className="text-sm font-semibold text-white leading-tight">
                          {item.title.length > 48 ? item.title.slice(0, 48) + "…" : item.title}
                        </p>
                        <p className="text-[11px] text-white/60">
                          {item.sellerName} • {timeAgo(item.timestamp)}
                        </p>
                      </div>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-md object-cover border border-white/20"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
