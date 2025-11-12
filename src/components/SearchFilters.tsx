"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSelectedCarId, loadMyCars, vehicleLabel } from "@/lib/garage";

export default function SearchFilters({
  action = "/search",
  q: initialQ = "",
}: {
  action?: string;
  q?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  const [q, setQ] = useState(initialQ);
  const category = sp.get("category") || "";
  const min = sp.get("min") || "";
  const max = sp.get("max") || "";
  const myCarFlag = sp.get("mycar") === "1";

  const [defaultCarLabel, setDefaultCarLabel] = useState<string>("");

  useEffect(() => {
    const id = getSelectedCarId();
    const cars = loadMyCars();
    const car = cars.find((c) => c.id === id) || null;
    setDefaultCarLabel(vehicleLabel(car));
    const onGarage = () => {
      const id2 = getSelectedCarId();
      const cars2 = loadMyCars();
      const car2 = cars2.find((c) => c.id === id2) || null;
      setDefaultCarLabel(vehicleLabel(car2));
    };
    window.addEventListener("ms:garage", onGarage as EventListener);
    return () => window.removeEventListener("ms:garage", onGarage as EventListener);
  }, []);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const params = new URLSearchParams(sp?.toString() || "");
      q ? params.set("q", q) : params.delete("q");
      category ? params.set("category", category) : params.delete("category");
      min ? params.set("min", min) : params.delete("min");
      max ? params.set("max", max) : params.delete("max");
      // my car flag
      if (defaultCarLabel && myCarFlag) params.set("mycar", "1");
      else params.delete("mycar");

      router.push(`${action}?${params.toString()}`);
    },
    [router, action, sp, q, category, min, max, defaultCarLabel, myCarFlag]
  );

  const categories = useMemo(
    () => [
      { value: "", label: "All categories" },
      { value: "oem", label: "OEM" },
      { value: "aftermarket", label: "Aftermarket" },
      { value: "tools", label: "Tools & Accessories" },
    ],
    []
  );

  return (
    <>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Main query */}
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search parts or enter registration…"
          className="md:col-span-2 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {/* Category */}
        <select
          name="category"
          defaultValue={category}
          onChange={(e) => {
            const params = new URLSearchParams(sp?.toString() || "");
            const v = e.target.value;
            v ? params.set("category", v) : params.delete("category");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Submit */}
        <button
          type="submit"
          className="rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600"
        >
          Search
        </button>

        {/* Row 2 */}
        <div className="md:col-span-4 mt-2 flex flex-wrap items-center gap-4">
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Price</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Min"
              defaultValue={min}
              onBlur={(e) => {
                const params = new URLSearchParams(sp?.toString() || "");
                const v = e.target.value.trim();
                v ? params.set("min", v) : params.delete("min");
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <span className="text-gray-500">–</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Max"
              defaultValue={max}
              onBlur={(e) => {
                const params = new URLSearchParams(sp?.toString() || "");
                const v = e.target.value.trim();
                v ? params.set("max", v) : params.delete("max");
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* For my car */}
          <label className={`flex items-center gap-2 text-sm ${defaultCarLabel ? "text-gray-800" : "text-gray-400"}`}>
            <input
              type="checkbox"
              checked={!!defaultCarLabel && myCarFlag}
              disabled={!defaultCarLabel}
              onChange={(e) => {
                const on = e.target.checked && !!defaultCarLabel;
                const params = new URLSearchParams(sp?.toString() || "");
                if (on) params.set("mycar", "1");
                else params.delete("mycar");
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
            For my car{defaultCarLabel ? ` (${defaultCarLabel})` : " (set a default in My Garage)"}
          </label>
        </div>
      </form>
    </>
  );
}
