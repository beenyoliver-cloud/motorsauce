"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { nsKey } from "@/lib/auth";

export default function HomeHero() {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);

  async function submitPlateSearch() {
    const reg = plate.trim().toUpperCase().replace(/\s/g, ''); // Remove all spaces
    setPlateError(null);
    if (!reg) {
      setPlateError("Enter a registration");
      return;
    }
    setPlateLoading(true);
    try {
      const res = await fetch(`/api/garage/registration-lookup?reg=${encodeURIComponent(reg)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Lookup failed");
      }

      // Persist last successful lookup to help My Garage prefill
      try {
        const key = nsKey("last_dvla_lookup");
        localStorage.setItem(key, JSON.stringify({
          make: data.make,
          model: data.model,
          year: data.year,
          trim: data.trim,
          at: Date.now(),
          reg,
        }));
      } catch {}

      const params = new URLSearchParams();
      if (data.make) params.set("make", data.make);
      if (data.model) params.set("model", data.model);
      if (typeof data.year === "number" && Number.isFinite(data.year)) {
        params.set("yearMin", String(data.year));
        params.set("yearMax", String(data.year));
      }
      router.push(`/search${params.toString() ? '?' + params.toString() : ''}`);
    } catch (e: any) {
      setPlateError(e?.message || "Registration not found");
    } finally {
      setPlateLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 md:p-6 transition-all duration-300 hover:shadow-lg hover:border-yellow-300">
      <div className="max-w-4xl">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-black tracking-tight animate-fadeIn leading-tight">Find the right part for your ride</h1>

        {/* Registration search (homepage stays focused) */}
        <div className="mt-2 sm:mt-3 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3 rounded-xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
            <label className="text-xs font-semibold text-gray-700 md:pr-2">Search by registration</label>
            <div className="flex items-center gap-2">
              {/* UK Number Plate Style Input */}
              <div className="relative flex-1 flex items-stretch">
                {/* Blue band with GB */}
                <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-1.5 py-1 rounded-l-md">
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[8px] font-bold">🇬🇧</span>
                    <span className="text-[8px] font-bold tracking-tight">UK</span>
                  </div>
                </div>
                {/* Yellow plate input */}
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="AB12 CDE"
                  className="flex-1 border-2 border-l-0 border-black bg-[#FFD038] text-black placeholder:text-gray-600 px-3 py-2 text-base sm:text-lg uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-black rounded-r-md font-bold"
                  style={{ 
                    fontFamily: "'UK Number Plate', 'Charles Wright', 'Courier New', monospace",
                    letterSpacing: '0.15em'
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submitPlateSearch}
              disabled={plateLoading}
              className="justify-self-start md:justify-self-end inline-flex items-center gap-1.5 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2.5 text-sm hover:bg-yellow-600 disabled:opacity-50 transition-all"
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
              <div className="md:col-span-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{plateError}</div>
            )}
          </div>

          <p className="mt-2 text-xs sm:text-sm text-gray-700">
            We’ll match parts to your car’s make, model and year.
          </p>
        </div>
      </div>
    </div>
  );
}
