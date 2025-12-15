import Link from "next/link";
import { cache } from "react";
import { cookies } from "next/headers";
import SafeImage from "@/components/SafeImage";
import { HotBadgeSmall } from "@/components/HotBadge";

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

  if (!items.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <Link href="/search" className="text-sm text-gray-600 hover:text-yellow-600 hover:underline transition-colors duration-300">View all</Link>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <div className="px-1 flex gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/listing/${p.id}`}
              className="group min-w-[160px] max-w-[200px] sm:min-w-[200px] sm:max-w-[240px] border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md hover:border-yellow-400 transition-colors duration-200"
            >
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                <HotBadgeSmall viewCount={p.viewCount} threshold={10} />
                <SafeImage src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/10 transition-colors duration-200" />
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-yellow-600 transition-colors duration-200">{p.title}</div>
                <div className="mt-1 text-sm font-bold text-gray-900 group-hover:text-yellow-600 transition-colors duration-200">{p.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const getListingPool = cache(async (): Promise<Listing[]> => {
  try {
    const res = await fetch("/api/listings?limit=200", { cache: "no-store" });
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
