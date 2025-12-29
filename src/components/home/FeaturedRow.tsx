import Link from "next/link";
import { cache } from "react";
import { cookies } from "next/headers";
import ListingCard from "@/components/ListingCard";

type Listing = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  createdAt: string;
  viewCount: number;
  make?: string;
  model?: string;
  year?: number;
};

type ActiveCarPreference = {
  make?: string;
  model?: string;
  year?: number;
};

const ACTIVE_CAR_COOKIE = "ms_active_car";
const FALLBACK_SITE_URL = "http://localhost:3000";

export default async function FeaturedRow({
  title,
  variant = "new",
  limit = 12,
}: {
  title: string;
  variant?: "new" | "under250" | "under20";
  limit?: number;
}) {
  const allListings = await getListingPool();
  const activeCar = await readActiveCarPreference();
  const items = pickVariant(allListings, variant, limit, activeCar);

  if (!items.length || items.length <= 5) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-black tracking-tight">{title}</h2>
        <Link href="/search" className="text-sm text-gray-700 hover:text-yellow-600 inline-flex items-center gap-1 transition-colors duration-300">
          View all
          <span aria-hidden>→</span>
        </Link>
      </div>
      {/* Mobile: horizontal scroll, Desktop: fixed grid of 5 */}
      <div className="overflow-x-auto md:overflow-visible">
        <div className="flex gap-4 md:grid md:grid-cols-5">
          {items.slice(0, 5).map((p) => (
            <ListingCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={p.price}
              image={p.image}
              make={p.make}
              model={p.model}
              year={p.year}
              createdAt={p.createdAt}
              className="min-w-[80px] max-w-[100px] sm:min-w-[100px] sm:max-w-[120px] md:min-w-0 md:max-w-none"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const getListingPool = cache(async (): Promise<Listing[]> => {
  try {
    const res = await fetch(listingsApiUrl("/api/listings?limit=200"), { 
      next: { revalidate: 300 } // 5 minutes
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as Listing[];
  } catch {
    return [];
  }
});

function pickVariant(
  listings: Listing[],
  variant: "new" | "under250" | "under20",
  limit: number,
  activeCar: ActiveCarPreference | null
) {
  const safeLimit = Number.isFinite(limit) ? limit : 12;
  const cap = variant === "under20" ? 20 : variant === "under250" ? 250 : null;
  const filtered = listings.filter((listing) => {
    if (!cap) return true;
    return priceOf(listing) <= cap;
  });

  const pref = normalizeActiveCar(activeCar);
  const hasPref = !!(pref.make || pref.model || typeof pref.year === "number");

  if (hasPref) {
    return filtered
      .slice()
      .sort((a, b) => {
        const diff = scoreListing(b, pref) - scoreListing(a, pref);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, safeLimit);
  }

  if (cap && filtered.length > safeLimit) {
    return filtered
      .map((item) => ({ item, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(({ item }) => item)
      .slice(0, safeLimit);
  }

  return filtered.slice(0, safeLimit);
}

function listingsApiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : FALLBACK_SITE_URL);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readActiveCarPreference(): Promise<ActiveCarPreference | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_CAR_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const make = typeof parsed.make === "string" ? parsed.make : undefined;
    const model = typeof parsed.model === "string" ? parsed.model : undefined;
    const yearValue =
      typeof parsed.year === "number"
        ? parsed.year
        : typeof parsed.year === "string"
        ? Number(parsed.year.replace(/[^\d]/g, ""))
        : undefined;
    if (!make && !model && !yearValue) return null;
    const preference: ActiveCarPreference = {};
    if (make) preference.make = make;
    if (model) preference.model = model;
    if (Number.isFinite(yearValue)) preference.year = yearValue;
    return preference;
  } catch {
    return null;
  }
}

function normalizeActiveCar(pref: ActiveCarPreference | null) {
  return {
    make: pref?.make ? pref.make.toLowerCase().trim() : "",
    model: pref?.model ? pref.model.toLowerCase().trim() : "",
    year: typeof pref?.year === "number" && Number.isFinite(pref.year) ? pref.year : undefined,
  };
}

function scoreListing(listing: Listing, pref: ReturnType<typeof normalizeActiveCar>) {
  let score = 0;
  const title = String(listing.title || "").toLowerCase();
  if (pref.make) {
    const listingMake = String(listing.make || "").toLowerCase();
    if (listingMake === pref.make) score += 3;
    else if (title.includes(pref.make)) score += 2;
  }
  if (pref.model) {
    const listingModel = String(listing.model || "").toLowerCase();
    if (listingModel === pref.model) score += 3;
    else if (title.includes(pref.model)) score += 2;
  }
  if (typeof pref.year === "number") {
    if (typeof listing.year === "number" && listing.year === pref.year) {
      score += 1;
    } else if (title.includes(String(pref.year))) {
      score += 1;
    }
  }

  const p = priceOf(listing);
  if (Number.isFinite(p)) {
    score += Math.max(0, 3 - Math.log10(Math.max(1, p)));
  }
  return score;
}

function priceOf(listing: Listing) {
  const value = Number(String(listing.price).replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
