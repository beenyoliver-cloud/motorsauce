// app/compatibility/page.tsx (or src/app/compatibility/page.tsx)
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Filter,
  Car as CarIcon,
  Wrench,
} from "lucide-react";

// ✅ Same garage helpers/types as the rest of your app
import {
  Car as CarType,
  loadMyCars,
  getSelectedCarId,
  vehicleLabel,
} from "@/lib/garage";

// ✅ Same auth helper your Header uses
import { getCurrentUser, type LocalUser } from "@/lib/auth";

/** ---------------------- Listing type (flexible) ---------------------- */
type Listing = {
  id: string | number;
  title: string;
  price?: number;
  currency?: string;
  images?: string[];
  thumbnail?: string;
  url?: string; // e.g. /listing/123
  href?: string;

  // Fitment-ish fields
  make?: string;
  model?: string;
  years?: number[];
  year?: number;
  yearFrom?: number | string;
  yearTo?: number | string;
  gen?: string;
  engine?: string;

  // Optional explicit compatibility matrix
  compatibility?: Array<{
    make?: string;
    model?: string;
    gen?: string;
    engine?: string;
    years?: number[];
    yearFrom?: number | string;
    yearTo?: number | string;
  }>;

  category?: string;
  condition?: string;
  tags?: string[];
};

/** ------------------------ Small utilities ------------------------ */
const slug = (x?: string) =>
  (x || "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

const toNum = (v: unknown) => {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number | undefined);
  return Number.isFinite(n as number) ? (n as number) : undefined;
};

const inRange = (y: number, start?: number, end?: number) => {
  if (typeof start === "number" && typeof end === "number") return y >= start && y <= end;
  if (typeof start === "number") return y >= start;
  if (typeof end === "number") return y <= end;
  return true;
};

function yearsOverlap(
  listing: { years?: number[]; year?: number; yearFrom?: number | string; yearTo?: number | string },
  userYears: number[] | undefined
) {
  if (!userYears || userYears.length === 0) return true;
  if (Array.isArray(listing.years) && listing.years.length) {
    return listing.years.some((y) => userYears.includes(y));
  }
  if (typeof listing.year === "number") {
    return userYears.includes(listing.year);
  }
  const yf = toNum(listing.yearFrom);
  const yt = toNum(listing.yearTo);
  return userYears.some((y) => inRange(y, yf, yt));
}

const sameOrUnknown = (a?: string, b?: string) => (!a || !b ? true : slug(a) === slug(b));

function money(amount?: number, currency = "GBP") {
  if (typeof amount !== "number") return "";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `£${amount.toFixed(0)}`;
  }
}

/** ---------------------- Load listings (mock-friendly) ---------------------- */
async function loadListings(): Promise<Listing[]> {
  // Try local helper first (works with your mock data module if present)
  try {
    // @ts-ignore optional dev helper
    const mod = await import("@/listings");
    const data =
      (typeof mod.getAllListings === "function" && (await mod.getAllListings())) ||
      mod.default ||
      mod.listings ||
      [];
    if (Array.isArray(data) && data.length) return data as Listing[];
  } catch {
    /* ignore */
  }

  // Fallback: REST endpoint (create /api/listings if needed)
  try {
    const res = await fetch("/api/listings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as Listing[];
    }
  } catch {
    /* ignore */
  }

  return [];
}

/** ------------------------ Matching against Garage ------------------------ */
function toUserYears(car?: Pick<CarType, "year">) {
  // Garage stores year as a string (e.g. "2018") – convert to number array
  if (!car?.year) return undefined;
  const y = parseInt(String(car.year), 10);
  return Number.isFinite(y) ? [y] : undefined;
}

function matchesListing(listing: Listing, car: CarType) {
  // Require make/model if the listing specifies them
  if (listing.make && car.make && slug(listing.make) !== slug(car.make)) return false;
  if (listing.model && car.model && slug(listing.model) !== slug(car.model)) return false;

  // Enforce gen/engine only when present on BOTH sides
    const carGen = (car && typeof car === "object" ? (car as Record<string, unknown>).gen : undefined);
    const carGenStr = typeof carGen === "string" ? carGen : undefined;
    const carEngine = (car && typeof car === "object" ? (car as Record<string, unknown>).engine : undefined);
    const carEngineStr = typeof carEngine === "string" ? carEngine : undefined;
    if (listing.gen && carGenStr && slug(listing.gen) !== slug(carGenStr)) return false;
    if (listing.engine && carEngineStr && slug(listing.engine) !== slug(carEngineStr)) return false;

  // Years
  const userYears = toUserYears(car);
  if (!yearsOverlap(listing, userYears)) return false;

  // If explicit matrix provided, at least one entry must match
  if (Array.isArray(listing.compatibility) && listing.compatibility.length) {
    const ok = listing.compatibility.some((c) => {
      const yf = toNum(c.yearFrom);
      const yt = toNum(c.yearTo);
      return (
  sameOrUnknown(c.make, car.make) &&
  sameOrUnknown(c.model, car.model) &&
  sameOrUnknown(c.gen, carGenStr) &&
  sameOrUnknown(c.engine, carEngineStr) &&
        (c.years && c.years.length
          ? c.years.some((y) => (userYears || []).includes(y))
          : yearsOverlap({ yearFrom: yf, yearTo: yt }, userYears))
      );
    });
    if (!ok) return false;
  }

  return true;
}

/** ----------------------------- Page ----------------------------- */
export default function CompatibilityPage() {
  const [selectedCar, setSelectedCar] = useState<CarType | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔗 Compute My Profile link exactly like Header
  const [me, setMe] = useState<LocalUser | null>(null);
  const [profileHref, setProfileHref] = useState<string>("/auth/login");
  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await getCurrentUser();
      if (!alive) return;
      setMe(u);
      setProfileHref(u ? `/profile/${encodeURIComponent(u.name)}` : "/auth/login");
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Read default car (same as Garage)
  useEffect(() => {
    const cars = loadMyCars();
    const selId = getSelectedCarId();
    const fav = cars.find((c) => c.id === selId) || cars[0] || null;
    setSelectedCar(fav || null);

    // Refresh if Garage changes
    const onGarage = () => {
      const cs = loadMyCars();
      const id = getSelectedCarId();
      setSelectedCar(cs.find((c) => c.id === id) || cs[0] || null);
    };
    window.addEventListener("ms:garage", onGarage as EventListener);
    return () => window.removeEventListener("ms:garage", onGarage as EventListener);
  }, []);

  // Load listings
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await loadListings();
      if (!alive) return;
      setListings(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const compatible = useMemo(() => {
    if (!selectedCar || !Array.isArray(listings)) return [];
    return listings.filter((l) => matchesListing(l, selectedCar));
  }, [listings, selectedCar]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Compatibility</span>
      </nav>

      {/* Hero */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-yellow-700" />
          Fits your default vehicle
        </h1>

        {selectedCar ? (
          <p className="mt-2 text-gray-700">
            Showing parts compatible with{" "}
            <span className="font-semibold text-black">
              {vehicleLabel(selectedCar)}
            </span>.
          </p>
        ) : (
          <p className="mt-2 text-gray-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            Add a vehicle and set it as default in your{" "}
            <Link className="underline" href={profileHref}>My Profile</Link> to see compatibility matches.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {/* 🔗 Updated: goes to My Profile (or Login) */}
          <Link
            href={profileHref}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-black hover:border-yellow-300 hover:text-yellow-700"
          >
            <CarIcon className="h-4 w-4" /> Manage your garage
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-3 py-1.5 text-sm"
          >
            <Filter className="h-4 w-4" /> Open full search
          </Link>
        </div>
      </div>

      {/* Results */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Compatible results</h2>
          {!!compatible?.length && (
            <span className="text-sm text-gray-600">{compatible.length} items</span>
          )}
        </div>

        {loading && (
          <div className="mt-8 flex items-center justify-center text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading compatible listings…
          </div>
        )}

        {!loading && selectedCar && compatible.length === 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-gray-700">
              No parts found that match your default vehicle yet.
            </p>
            <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>
                Try the <Link href="/search" className="underline">Advanced Search</Link> to widen filters.
              </li>
              <li>
                If your car has a specific generation/engine code, ensure listings include those details.
              </li>
              <li>Adjust price/condition or check back soon.</li>
            </ul>
          </div>
        )}

        {!loading && selectedCar && compatible.length > 0 && (
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {compatible.map((item) => {
              const img =
                item.thumbnail ||
                (Array.isArray(item.images) && item.images[0]) ||
                "/placeholder.svg";
              const href = item.url || item.href || `/listing/${item.id}`;
              return (
                <li
                  key={String(item.id)}
                  className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-sm hover:border-yellow-300 transition"
                >
                  <Link href={href} className="block">
                    <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={item.title}
                        className="h-full w-full object-cover object-center group-hover:opacity-95 transition"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-black line-clamp-2">{item.title}</h3>
                      <div className="mt-1 text-[13px] text-gray-600">
                        {item.condition ? `${item.condition} • ` : ""}
                        {item.category || "Part"}
                      </div>
                      {typeof item.price === "number" && (
                        <div className="mt-1 font-semibold text-black">
                          {money(item.price, item.currency || "GBP")}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tip */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-black flex items-center gap-2">
          <Wrench className="h-5 w-5 text-yellow-700" /> Tip
        </h3>
        <p className="mt-2 text-sm text-gray-700">
          Listings with OEM codes or explicit fitment notes (make • model • year • gen/engine) are easiest to verify.
        </p>
      </div>
    </section>
  );
}
