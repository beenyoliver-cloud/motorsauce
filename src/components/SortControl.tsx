"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SORTS = [
  ["relevance", "Relevance"],
  ["price_asc", "Price: Low to High"],
  ["price_desc", "Price: High to Low"],
  ["newest", "Newest"],
] as const;

export default function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  const current = sp.get("sort") || "relevance";

  function setSort(val: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    val && val !== "relevance" ? params.set("sort", val) : params.delete("sort");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">Sort by</span>
      <select
        value={current}
        onChange={(e) => setSort(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        {SORTS.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
