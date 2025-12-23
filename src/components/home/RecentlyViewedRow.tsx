"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import ListingCard from "@/components/ListingCard";

type Listing = {
  id: string | number;
  title: string;
  price: number; // decimal price
  price_gbp?: string; // formatted string (backward compat)
  image: string;
  status: string;
  created_at?: string;
  previous_price?: number; // for price drops
};

async function fetchListing(id: string | number): Promise<Listing | null> {
  try {
    const res = await fetch(`/api/listings?id=${encodeURIComponent(String(id))}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data as Listing;
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
        // Filter out sold/draft listings - only show active
        const list = (results.filter(Boolean) as Listing[]).filter(l => l.status === "active");
        if (alive) setItems(list);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length || items.length <= 5) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
        </div>
        <button
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline transition"
          onClick={() => {
            try {
              localStorage.removeItem("ms:recently-viewed");
              setItems([]);
            } catch {}
          }}
        >
          Clear history
        </button>
      </div>

      <div className="relative">
        <div className="overflow-x-auto pb-2 md:overflow-visible">
          <div className="flex gap-4 min-w-min md:grid md:grid-cols-5">
            {items.slice(0, 5).map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                image={listing.image}
                status={listing.status}
                createdAt={listing.created_at}
                previousPrice={listing.previous_price}
                className="min-w-[100px] max-w-[120px] md:min-w-0 md:max-w-none flex-shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Scroll indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </section>
  );
}
