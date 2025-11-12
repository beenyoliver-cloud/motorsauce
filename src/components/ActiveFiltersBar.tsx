"use client";

import { usePathname, useRouter } from "next/navigation";
import { getSelectedCarId, loadMyCars, vehicleLabel } from "@/lib/garage";
import { useState, useEffect } from "react";

export default function ActiveFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  const category = sp.get("category") || "";
  const min = sp.get("min") || "";
  const max = sp.get("max") || "";
  const myCar = sp.get("mycar") === "1";

  const chips: Array<{ key: string; label: string }> = [];

  if (category) {
    const label =
      category === "oem" ? "Category: OEM" :
      category === "aftermarket" ? "Category: Aftermarket" :
      category === "tools" ? "Category: Tools" :
      `Category: ${category}`;
    chips.push({ key: "category", label });
  }
  if (min || max) chips.push({ key: "price", label: `Price: ${min || "0"} – ${max || "∞"}` });

  if (myCar) {
    const id = getSelectedCarId();
    const car = loadMyCars().find(c => c.id === id) || null;
    const label = vehicleLabel(car) || "My car";
    chips.push({ key: "mycar", label });
  }

  if (chips.length === 0) return null;

  function clear(key: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    if (key === "price") {
      params.delete("min");
      params.delete("max");
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(sp?.toString() || "");
    ["category", "min", "max", "mycar"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => clear(c.key)}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
        >
          {c.label} <span className="ml-1 text-gray-500">×</span>
        </button>
      ))}
      <button
        onClick={clearAll}
        className="text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      >
        Clear all
      </button>
    </div>
  );
}
