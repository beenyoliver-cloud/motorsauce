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
  variant?: "new" | "under250";
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
        if (variant === "under250") {
          list = list.filter((l) => {
            const n = Number(String(l.price).replace(/[^\d.]/g, ""));
            return Number.isFinite(n) && n <= 250;
          });
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

  if (loading) return null;
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
