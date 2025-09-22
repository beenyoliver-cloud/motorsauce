"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  ["relevance", "Relevance"],
  ["price_asc", "Price: Low to High"],
  ["price_desc", "Price: High to Low"],
  ["newest", "Newest"],
] as const;

export default function SortControl() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

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
