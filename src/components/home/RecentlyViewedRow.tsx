"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
};

async function fetchListing(id: string | number): Promise<Listing | null> {
  try {
    const res = await fetch(`/api/listings?id=${encodeURIComponent(String(id))}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Listing;
  } catch {
    return null;
  }
}

export default function RecentlyViewedRow() {
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = localStorage.getItem("ms:recently-viewed");
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.length) return;
        const subset = ids.slice(0, 10);
        const results = await Promise.all(subset.map((id) => fetchListing(id)));
        const list = results.filter(Boolean) as Listing[];
        if (alive) setItems(list);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-black">Recently viewed</h2>
        <button
          className="text-sm text-gray-600 hover:underline"
          onClick={() => {
            try {
              localStorage.removeItem("ms:recently-viewed");
              setItems([]);
            } catch {}
          }}
        >
          Clear
        </button>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <div className="px-1 flex gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/listing/${p.id}`}
              className="min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition"
            >
              <div className="relative aspect-[4/3] bg-gray-50">
                <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-900 line-clamp-2">{p.title}</div>
                <div className="mt-1 text-sm font-bold text-gray-900">{p.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
