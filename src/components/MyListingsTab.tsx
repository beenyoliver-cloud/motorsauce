"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import FavoriteButton from "@/components/FavoriteButton";
import { getCurrentUserSync } from "@/lib/auth";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  images?: string[];
  seller?: { name?: string };
  ownerId?: string;
  sellerId?: string;
};

export default function MyListingsTab({ sellerName }: { sellerName?: string }) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/listings", { cache: "no-store" })
      .then((r) => r.json())
      .then((all) => Array.isArray(all) ? all : [])
      .then((all) => {
        const u = getCurrentUserSync();
        const currentName = u?.name || "";
        const me = sellerName ? norm(sellerName) === norm(currentName) : true;

  const uid = u?.id;

        const result = all.filter((l: Listing) => {
          const seller = norm(l?.seller?.name || "");
          const id = l?.sellerId || l?.ownerId;
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
    <div className="space-y-2 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-6 sm:space-y-0">
      {items.map((l) => {
        const u = getCurrentUserSync();
        const uid = u?.id;
        const isMine = Boolean(uid && (l.sellerId === uid || l.ownerId === uid || norm(l?.seller?.name || "") === norm(u?.name || "")));
        return (
          <div key={String(l.id)} className="group relative border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition">
            {/* Mobile: Row layout, Tablet+: Block layout */}
            <Link href={`/listing/${l.id}`} className="flex sm:block items-center gap-3 sm:gap-0">
              <div className="relative w-[120px] h-[120px] sm:w-auto sm:h-auto sm:aspect-[4/3] bg-gray-50 overflow-hidden shrink-0">
                <SafeImage src={l.image} alt={l.title} className="w-full h-full object-cover object-center" />
              </div>
              <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 pr-14 sm:pr-0">{l.title}</h3>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-base font-bold text-gray-900">{l.price}</div>
                  <FavoriteButton listingId={String(l.id)} showLabel={false} />
                </div>
              </div>
            </Link>
            {isMine && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/listing/${l.id}/edit`);
                }}
                className="absolute top-2 right-2 sm:top-2 sm:right-2 rounded-md bg-yellow-500 text-black px-3 py-1.5 text-xs font-semibold sm:opacity-0 sm:group-hover:opacity-100 sm:bg-black/70 sm:text-white transition z-20 hover:bg-yellow-600 sm:hover:bg-black shadow-sm"
              >
                Edit
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function norm(v: string) {
  return String(v || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}
