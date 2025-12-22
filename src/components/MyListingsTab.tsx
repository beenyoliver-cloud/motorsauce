"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import FavoriteButton from "@/components/FavoriteButton";
import { getCurrentUserSync } from "@/lib/auth";
import { Loader2 } from "lucide-react";

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
        const uid = u?.id;
        const me = sellerName ? norm(sellerName) === norm(currentName) : true;

        const result = all.filter((l: Listing) => {
          const seller = norm(l?.seller?.name || "");
          const id = l?.sellerId || l?.ownerId;
          if (sellerName) {
            if (me) {
              return (uid && id === uid) || seller === norm(sellerName);
            }
            return seller === norm(sellerName);
          }
          return (uid && id === uid) || seller === norm(currentName);
        });

        setItems(result);
      })
      .finally(() => setLoading(false));
  }, [sellerName]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 animate-pulse">
            <div className="h-40 rounded-lg bg-gray-100" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const isMe = sellerName ? norm(sellerName) === norm(getCurrentUserSync()?.name || "") : true;
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">No listings yet</h3>
        <p className="text-sm text-gray-600">
          {isMe
            ? "List your first part to start building your reputation."
            : `${sellerName} hasn't listed anything yet.`}
        </p>
        {isMe && (
          <button
            onClick={() => router.push("/sell")}
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
          >
            List a part
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => {
        const u = getCurrentUserSync();
        const uid = u?.id;
        const isMine = Boolean(uid && (l.sellerId === uid || l.ownerId === uid || norm(l?.seller?.name || "") === norm(u?.name || "")));
        return (
          <div key={String(l.id)} className="group relative border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition">
            {/* Edit button - positioned absolutely on top */}
            {isMine && (
              <a
                href={`/listing/${l.id}/edit`}
                className="absolute top-2 right-2 sm:top-2 sm:right-2 rounded-md bg-yellow-500 text-black px-3 py-1.5 text-xs font-semibold sm:opacity-0 sm:group-hover:opacity-100 sm:bg-black/70 sm:text-white transition z-50 hover:bg-yellow-600 sm:hover:bg-black shadow-sm"
              >
                Edit
              </a>
            )}
            
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
          </div>
        );
      })}
    </div>
  );
}

function norm(v: string) {
  return String(v || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}
