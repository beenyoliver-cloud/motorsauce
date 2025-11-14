"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  createdAt: string;
};

export default function FeaturedRow({
  title,
  variant = "new",
  limit = 12,
}: {
  title: string;
  variant?: "new" | "under250" | "under20";
  limit?: number;
}) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/listings", { cache: "no-store" });
        const rows = (await res.json()) as Listing[];
        let list = Array.isArray(rows) ? rows : [];
        // Parse price helper
        const priceOf = (l: Listing) => Number(String(l.price).replace(/[^\d.]/g, ""));

        // Filter by price cap for variants
        if (variant === "under250" || variant === "under20") {
          const cap = variant === "under20" ? 20 : 250;
          list = list.filter((l) => {
            const n = priceOf(l);
            return Number.isFinite(n) && n <= cap;
          });
        }

        // Personalization: prioritize items that fit user's active car
        try {
          const { loadMyCars } = await import("@/lib/garage");
          const cars = loadMyCars();
          const active = cars?.[0];

          if (active) {
            const mk = String(active.make || "").trim().toLowerCase();
            const md = String(active.model || "").trim().toLowerCase();
            const yr = Number(String(active.year || "").replace(/[^\d]/g, ""));

            const score = (l: Listing) => {
              // We only have the public Listing shape here; rely on title heuristics for fit
              // Prefer exact make/model mentions in title and cheap price for under variants
              const t = String(l.title || "").toLowerCase();
              let s = 0;
              if (mk && t.includes(mk)) s += 2;
              if (md && t.includes(md)) s += 2;
              if (Number.isFinite(yr)) {
                // Loose year match in title (e.g., 2016/16, 2008-2012)
                if (t.includes(String(yr))) s += 1;
              }
              // Slightly prefer cheaper within cap
              const p = priceOf(l);
              if (Number.isFinite(p)) s += Math.max(0, 3 - Math.log10(Math.max(1, p)));
              return s;
            };

            // Sort by score desc, then recency by createdAt (if variant === 'new')
            list = list
              .slice()
              .sort((a, b) => {
                const sb = score(b) - score(a);
                if (sb !== 0) return sb;
                if (variant === "new") {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return 0;
              });
          } else if (variant === "under250" || variant === "under20") {
            // No car selected: randomize under-cap selection for variety
            list = list
              .map((l) => ({ l, r: Math.random() }))
              .sort((a, b) => a.r - b.r)
              .map(({ l }) => l);
          }
        } catch {
          // If garage import fails (SSR/edge or privacy), just continue with existing order
        }

        if (alive) setItems(list.slice(0, limit));
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [variant, limit]);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-black">{title}</h2>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <div className="px-1 flex gap-3">
            {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
              <div key={i} className="min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="relative aspect-[4/3] bg-gray-100 animate-pulse" />
                <div className="p-2 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (!items.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <Link href="/search" className="text-sm text-gray-600 hover:underline">View all</Link>
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
