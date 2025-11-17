"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { Clock, TrendingDown, CheckCircle2 } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";

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
        const list = results.filter(Boolean) as Listing[];
        if (alive) setItems(list);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;

  // Helper to format price
  const formatPrice = (price: number | string) => {
    if (typeof price === "string") return price;
    return `£${price.toFixed(2)}`;
  };

  // Helper to check if recently listed (within 3 days)
  const isNew = (created_at?: string) => {
    if (!created_at) return false;
    const diff = Date.now() - new Date(created_at).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000; // 3 days
  };

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
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="flex gap-4 min-w-min">
            {items.map((listing) => {
              const price = typeof listing.price === "number" ? listing.price : parseFloat(listing.price_gbp || "0");
              const hasPriceDrop = listing.previous_price && listing.previous_price > price;
              const priceDrop = hasPriceDrop ? ((listing.previous_price! - price) / listing.previous_price!) * 100 : 0;

              return (
                <div
                  key={listing.id}
                  className="group relative min-w-[200px] max-w-[240px] flex-shrink-0"
                >
                  <Link
                    href={`/listing/${listing.id}`}
                    className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      <SafeImage
                        src={listing.image}
                        alt={listing.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Badges overlay */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {listing.status === "active" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-semibold rounded-full shadow">
                            <CheckCircle2 className="h-3 w-3" />
                            Available
                          </span>
                        )}
                        {isNew(listing.created_at) && (
                          <span className="inline-block px-2 py-0.5 bg-blue-500 text-white text-[10px] font-semibold rounded-full shadow">
                            NEW
                          </span>
                        )}
                        {hasPriceDrop && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full shadow">
                            <TrendingDown className="h-3 w-3" />
                            {priceDrop.toFixed(0)}% OFF
                          </span>
                        )}
                      </div>

                      {/* Favorite button overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div onClick={(e) => e.preventDefault()}>
                          <FavoriteButton listingId={String(listing.id)} showLabel={false} className="shadow-md" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
                        {listing.title}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(listing.price || listing.price_gbp || 0)}
                        </span>
                        {hasPriceDrop && (
                          <span className="text-xs text-gray-500 line-through">
                            £{listing.previous_price!.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
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
