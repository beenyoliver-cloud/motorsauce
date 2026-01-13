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
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white overflow-hidden animate-pulse">
            <div className="w-full aspect-[4/3] bg-gray-100" />
            <div className="p-2 space-y-2">
              <div className="h-3 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const isMe = sellerName ? norm(sellerName) === norm(getCurrentUserSync()?.name || "") : true;
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white shadow-sm p-8 text-center space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">No listings yet</h3>
        <p className="text-sm text-gray-600">
          {isMe
            ? "List your first part to start building your reputation."
            : `${sellerName} hasn't listed anything yet.`}
        </p>
        {isMe && (
          <button
            onClick={() => router.push("/sell")}
            className="inline-flex items-center justify-center rounded-full bg-yellow-500 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-600"
          >
            List a part
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((l) => {
        const u = getCurrentUserSync();
        const uid = u?.id;
        const isMine = Boolean(uid && (l.sellerId === uid || l.ownerId === uid || norm(l?.seller?.name || "") === norm(u?.name || "")));
        return (
          <div key={String(l.id)} className="group relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
            {/* Edit button - positioned absolutely on top */}
            {isMine && (
              <a
                href={`/listing/${l.id}/edit`}
                className="absolute top-1.5 right-1.5 rounded-md bg-yellow-500 text-black px-2 py-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition z-50 hover:bg-yellow-600 shadow-sm"
              >
                Edit
              </a>
            )}
            
            {/* Compact block layout */}
            <Link href={`/listing/${l.id}`} className="block">
              <div className="relative w-full aspect-[4/3] bg-gray-50 overflow-hidden">
                <SafeImage src={l.image} alt={l.title} className="w-full h-full object-cover object-center" />
              </div>
              <div className="p-2 flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{l.title}</h3>
                <div className="flex items-center justify-between gap-1">
                  <div className="text-sm font-bold text-gray-900">{l.price}</div>
                  <div onClick={(e) => e.preventDefault()}>
                    <FavoriteButton listingId={String(l.id)} showLabel={false} className="!px-1.5 !py-1" />
                  </div>
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
