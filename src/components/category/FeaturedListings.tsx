// src/components/category/FeaturedListings.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  price: number;
  images: string[];
  condition: string;
  make?: string;
  model?: string;
};

type Props = {
  category: "oem" | "aftermarket" | "tools" | "OEM" | "Aftermarket" | "Tools";
  title?: string;
  limit?: number;
};

export default function FeaturedListings({ category, title, limit = 8 }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedCategory = category.toLowerCase() as "oem" | "aftermarket" | "tools";

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Database uses "Tool" (singular) for the tools category
        const categoryParam = normalizedCategory === "tools" ? "Tool" : normalizedCategory === "oem" ? "OEM" : "Aftermarket";
        const res = await fetch(`/api/listings?category=${categoryParam}&limit=${limit}&status=active`);
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch featured listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [normalizedCategory, limit]);

  const categoryLabel = normalizedCategory === "oem" ? "OEM" : normalizedCategory === "aftermarket" ? "Aftermarket" : "Tools";
  const categoryParam = normalizedCategory === "tools" ? "Tools" : normalizedCategory === "oem" ? "OEM" : "Aftermarket";
  const displayTitle = title || `New ${categoryLabel} listings`;

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4">{displayTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (listings.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600" />
          <h2 className="text-xl md:text-2xl font-bold text-black">{displayTitle}</h2>
        </div>
        <Link
          href={`/search?category=${categoryParam}`}
          className="text-sm font-medium text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {listings.slice(0, limit).map((listing) => (
          <Link
            key={listing.id}
            href={`/listing/${listing.id}`}
            className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-yellow-300 transition-all"
          >
            {/* Image */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Sparkles className="h-10 w-10" />
                </div>
              )}
              {/* Condition badge */}
              {listing.condition && (
                <div className="absolute top-2 left-2 bg-white/90 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {listing.condition}
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-yellow-700 transition-colors">
                {listing.title}
              </div>
              {(listing.make || listing.model) && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {[listing.make, listing.model].filter(Boolean).join(" ")}
                </div>
              )}
              <div className="mt-2 text-base font-bold text-black">
                £{Number(listing.price).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
