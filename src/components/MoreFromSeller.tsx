"use client";

import { useEffect, useMemo, useState } from "react";
import ListingCard from "@/components/ListingCard";
import SellerLink from "@/components/SellerLink";

type Listing = {
  id: string | number;
  title: string;
  price: string | number;
  image: string;
  images?: string[];
  category?: string;
  condition?: string;
  make?: string;
  model?: string;
  year?: number;
  oem?: string;
  status?: string;
  createdAt?: string;
  seller?: {
    name?: string;
    avatar?: string;
    rating?: number;
    county?: string;
  };
  vehicles?: Array<{
    make?: string;
    model?: string;
    year?: number;
    universal?: boolean;
  }>;
  viewCount?: number;
};

type MoreFromSellerProps = {
  sellerId?: string | null;
  sellerName?: string | null;
  listingId?: string | number;
  limit?: number;
  includeDrafts?: boolean;
};

export default function MoreFromSeller({
  sellerId,
  sellerName,
  listingId,
  limit = 6,
  includeDrafts = false,
}: MoreFromSellerProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!sellerId) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/listings?seller_id=${encodeURIComponent(sellerId)}&limit=${limit + 1}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !Array.isArray(data)) return;
        const currentId = listingId ? String(listingId) : null;
        const filtered = data.filter((item: Listing) => {
          if (currentId && String(item.id) === currentId) return false;
          if (!includeDrafts) return item.status === "active";
          return item.status !== "sold";
        });
        setListings(filtered.slice(0, limit));
      } catch (error) {
        console.error("[MoreFromSeller] Error fetching listings:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [sellerId, listingId, limit, includeDrafts]);

  const heading = useMemo(() => {
    if (!sellerName) return "More from this seller";
    return `More from ${sellerName}`;
  }, [sellerName]);

  if (!sellerId) return null;

  if (loading) {
    return (
      <section className="mt-8 border-t border-gray-200 pt-6">
        <div className="mb-4 h-6 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-lg bg-gray-200" />
              <div className="mt-2 h-4 rounded bg-gray-200" />
              <div className="mt-1 h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (listings.length === 0) return null;

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-black">{heading}</h2>
        {sellerName && (
          <SellerLink
            sellerName={sellerName}
            className="text-xs font-semibold text-yellow-700 hover:text-yellow-800"
          >
            View seller profile →
          </SellerLink>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
        <div className="flex gap-3 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              price={listing.price}
              image={listing.image || listing.images?.[0] || "/images/placeholder.jpg"}
              category={listing.category}
              condition={listing.condition}
              make={listing.make}
              model={listing.model}
              year={listing.year}
              oem={listing.oem}
              status={listing.status}
              createdAt={listing.createdAt}
              seller={listing.seller}
              vehicles={listing.vehicles}
              viewCount={listing.viewCount}
              className="min-w-[150px] max-w-[170px] md:min-w-0 md:max-w-none"
              tight
            />
          ))}
        </div>
      </div>
    </section>
  );
}
