"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import FavoriteButton from "@/components/FavoriteButton";
import { getCurrentUser } from "@/lib/auth";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  images?: string[];
  seller?: { name?: string };
  ownerId?: string;
};

export default function MyListingsTab({ sellerName }: { sellerName?: string }) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings", { cache: "no-store" })
      .then((r) => r.json())
      .then((all) => Array.isArray(all) ? all : [])
      .then((all) => {
        const u = getCurrentUser();
        const currentName = u?.name || "";
        const me = sellerName ? norm(sellerName) === norm(currentName) : true;

        const uid = u?.id;

        const result = all.filter((l: Listing) => {
          const seller = norm(l?.seller?.name || "");
          const id = l?.ownerId;
          if (sellerName) {
            // Viewing a specific profile
            if (me) {
              // my profile: include both owned-by-me and listings credited to my seller name
              return (uid && id === uid) || seller === norm(sellerName);
            }
            // someone else: include only that seller's listings
            return seller === norm(sellerName);
          } else {
            // default: my own items
            return (uid && id === uid) || seller === norm(currentName);
          }
        });

        setItems(result);
      })
      .finally(() => setLoading(false));
  }, [sellerName]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
        No listings yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((l) => (
        <Link
          key={String(l.id)}
          href={`/listing/${l.id}`}
          className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition"
        >
          <div className="relative aspect-[4/3] bg-gray-50">
            <SafeImage src={l.image} alt={l.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</h3>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-base font-bold text-gray-900">{l.price}</div>
              <FavoriteButton listingId={String(l.id)} showLabel={false} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function norm(v: string) {
  return String(v || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}
