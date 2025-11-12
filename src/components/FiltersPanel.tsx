"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  const [open, setOpen] = useState(false);

  const category = sp.get("category") || "";
  const min = sp.get("min") || "";
  const max = sp.get("max") || "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    value ? params.set(key, value) : params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-md border border-gray-300 bg-white text-gray-800 text-sm px-3 py-1.5 hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        Filters
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="space-y-4">
            {/* Category */}
            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Category</div>
              <select
                value={category}
                onChange={(e) => setParam("category", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">All categories</option>
                <option value="oem">OEM</option>
                <option value="aftermarket">Aftermarket</option>
                <option value="tools">Tools & Accessories</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Price</div>
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Min"
                  defaultValue={min}
                  onBlur={(e) => setParam("min", e.target.value.trim())}
                  className="w-24 border border-gray-300 rounded-md px-2 py-1 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <span className="text-gray-500">–</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Max"
                  defaultValue={max}
                  onBlur={(e) => setParam("max", e.target.value.trim())}
                  className="w-24 border border-gray-300 rounded-md px-2 py-1 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 bg-white text-gray-800 text-sm px-3 py-1.5 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
