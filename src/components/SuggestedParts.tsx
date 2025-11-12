"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { loadMyCars, vehicleLabel } from "@/lib/garage";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
};

export default function SuggestedParts() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const garage = loadMyCars();
        // Read recent searches if present (optional; silent fallback)
        let searches: string[] = [];
        try {
          const raw = localStorage.getItem("ms:recent-searches");
          searches = raw ? JSON.parse(raw) : [];
        } catch {}

        const body = { garage, searches };
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setListings(data.slice(0, 12));
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="py-8">Loading suggestions…</div>;
  if (!listings.length)
    return (
      <div className="py-8 text-gray-600">
        No suggested parts yet. Uploads will appear here, or add vehicles to your garage to get personalized suggestions.
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {listings.map((p) => (
        <Link
          key={p.id}
          href={`/listing/${p.id}`}
          className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition"
        >
          <div className="relative aspect-[4/3] bg-gray-50">
            <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{p.title}</h3>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-base font-bold text-gray-900">{p.price}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
