import Link from "next/link";
import { cache } from "react";
import ListingCard from "@/components/ListingCard";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  createdAt?: string;
  viewCount?: number;
  make?: string;
  model?: string;
  year?: number;
};

const FALLBACK_SITE_URL = "http://localhost:3000";
const MIN_POPULAR_ITEMS = 3;
const MAX_POPULAR_ITEMS = 8;

function listingsApiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : FALLBACK_SITE_URL);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const getListingPool = cache(async (): Promise<Listing[]> => {
  try {
    const res = await fetch(listingsApiUrl("/api/listings?limit=60"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as Listing[];
  } catch {
    return [];
  }
});

function sortByPopularity(listings: Listing[]) {
  return listings
    .slice()
    .sort((a, b) => {
      const viewsA = typeof a.viewCount === "number" ? a.viewCount : 0;
      const viewsB = typeof b.viewCount === "number" ? b.viewCount : 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
}

function gridColsClass(count: number) {
  if (count >= 5) return "lg:grid-cols-5";
  if (count === 4) return "lg:grid-cols-4";
  return "lg:grid-cols-3";
}

export default async function PopularListingsRow() {
  const listings = await getListingPool();
  const items = sortByPopularity(listings).slice(0, MAX_POPULAR_ITEMS);
  if (items.length < MIN_POPULAR_ITEMS) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
            Popular right now
          </p>
          <h2 className="text-base sm:text-2xl font-bold text-slate-900">Popular listings</h2>
        </div>
        <Link href="/search" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
          Browse all →
        </Link>
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridColsClass(items.length)} gap-3 sm:gap-4`}>
        {items.map((listing) => (
          <ListingCard
            key={listing.id}
            id={listing.id}
            title={listing.title}
            price={listing.price}
            image={listing.image}
            createdAt={listing.createdAt}
            viewCount={listing.viewCount}
            make={listing.make}
            model={listing.model}
            year={listing.year}
          />
        ))}
      </div>
    </section>
  );
}
