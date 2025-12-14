"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { supabaseBrowser } from "@/lib/supabase";
import { ListingCardSkeleton } from "@/components/skeletons/Skeletons";
import { HotBadgeSmall } from "@/components/HotBadge";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  createdAt: string;
  viewCount: number;
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
        const res = await fetch("/api/listings?limit=200", { cache: "no-store" });
        const rows = (await res.json()) as unknown;
        let list: Listing[] = Array.isArray(rows) ? (rows as Listing[]) : [];

        // Fallback: if API fails or returns non-array/empty, query Supabase directly (public anon, RLS enforced)
        if (!Array.isArray(rows) || list.length === 0) {
          try {
            const sb = supabaseBrowser();
            const { data, error } = await sb
              .from("listings")
              .select("*")
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(50);

            if (!error && Array.isArray(data)) {
              list = (data as any[]).map((row) => {
                const images: string[] = Array.isArray(row.images) && row.images.length
                  ? row.images
                  : row.image_url
                  ? [row.image_url]
                  : row.image
                  ? [row.image]
                  : [];
                const price =
                  typeof row.price_cents === "number"
                    ? "£" + (row.price_cents / 100).toFixed(2)
                    : typeof row.price === "number"
                    ? "£" + Number(row.price).toFixed(2)
                    : typeof row.price === "string"
                    ? row.price.startsWith("£")
                      ? row.price
                      : `£${row.price}`
                    : "£0.00";
                const createdAt = row.created_at || new Date().toISOString();
                const viewCount = typeof row.view_count === "number" ? row.view_count : 0;
                return {
                  id: row.id,
                  title: row.title,
                  price,
                  image: images[0] || "/images/placeholder.jpg",
                  createdAt,
                  viewCount,
                } as Listing;
              });
            }
          } catch (e) {
            // Ignore fallback errors; we'll just show empty state
          }
        }
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
            {[...Array(Math.min(limit, 8))].map((_, i) => (
              <ListingCardSkeleton key={i} />
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
        <Link href="/search" className="text-sm text-gray-600 hover:text-yellow-600 hover:underline transition-colors duration-300">View all</Link>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <div className="px-1 flex gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/listing/${p.id}`}
              className="group min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md hover:border-yellow-400 transition-colors duration-200"
            >
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                <HotBadgeSmall viewCount={p.viewCount} threshold={10} />
                <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/10 transition-colors duration-200" />
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-yellow-600 transition-colors duration-200">{p.title}</div>
                <div className="mt-1 text-sm font-bold text-gray-900 group-hover:text-yellow-600 transition-colors duration-200">{p.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
