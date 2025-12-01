// app/registration/page.tsx (or src/app/registration/page.tsx)
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Loader2,
  Car as CarIcon,
  Wrench,
  AlertTriangle,
  Filter,
} from "lucide-react";

/* ========================= Types ========================= */
type Vehicle = {
  make?: string;
  model?: string;
  year?: number;
  gen?: string;
  engine?: string;
};

type Listing = {
  id: string | number;
  title: string;
  price?: number;
  currency?: string;
  images?: string[];
  thumbnail?: string;
  url?: string;
  href?: string;

  make?: string;
  model?: string;
  years?: number[];
  year?: number;
  yearFrom?: number | string;
  yearTo?: number | string;
  gen?: string;
  engine?: string;

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

/* ========================= Helpers ========================= */
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

/* ---- Reg formatting: keep only A–Z/0–9, force uppercase, format 'AB12 CDE' when possible ---- */
function normalizeRegInput(raw: string) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length <= 4) return s; // typing the first half
  if (s.length <= 7) return s.slice(0, 4) + " " + s.slice(4);
  return s.slice(0, 7).replace(/^(.{4})(.{3}).*$/, "$1 $2");
}

function regKey(reg: string) {
  return reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* ---- Simple brand/model presets for manual fallback (extend any time) ---- */
const MAKES = [
  "Audi",
  "BMW",
  "Volkswagen",
  "Mercedes-Benz",
  "Ford",
  "Vauxhall",
  "Toyota",
  "Nissan",
  "Honda",
  "Kia",
  "Hyundai",
  "Peugeot",
];

const MODELS: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q3", "Q5"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series"],
  Volkswagen: ["Golf", "Polo", "Passat", "Tiguan"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "GLA"],
  Ford: ["Fiesta", "Focus", "Mondeo", "Kuga"],
  Vauxhall: ["Corsa", "Astra", "Insignia", "Mokka"],
  Toyota: ["Yaris", "Corolla", "Auris", "CHR"],
  Nissan: ["Micra", "Qashqai", "Juke", "Leaf"],
  Honda: ["Civic", "Jazz", "CR-V"],
  Kia: ["Rio", "Ceed", "Sportage"],
  Hyundai: ["i10", "i20", "i30", "Tucson"],
  Peugeot: ["208", "308", "3008"],
};

/* ========================= Data loading ========================= */
async function loadListings(): Promise<Listing[]> {
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

/* ========================= Registration "decoder" =========================
   Tries:
   1) localStorage cache ("motorsauce:regmap")
   2) optional /api/registration?reg=AB12CDE (return { make, model, year, gen?, engine? })
   3) falls back to manual picker in the UI
========================================================================== */
async function lookupByReg(reg: string): Promise<Vehicle | null> {
  if (typeof window !== "undefined") {
    try {
      const m = JSON.parse(localStorage.getItem("motorsauce:regmap") || "{}");
      const key = regKey(reg);
      if (m && typeof m === "object" && m[key]) return m[key];
    } catch {}
  }
  try {
    const res = await fetch(`/api/registration?reg=${encodeURIComponent(reg)}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Vehicle;
      return data || null;
    }
  } catch {}
  return null;
}

function saveRegMapping(reg: string, v: Vehicle) {
  if (typeof window === "undefined") return;
  try {
    const key = regKey(reg);
    const raw = localStorage.getItem("motorsauce:regmap");
    const m = raw ? JSON.parse(raw) : {};
    m[key] = v;
    localStorage.setItem("motorsauce:regmap", JSON.stringify(m));
  } catch {}
}

/* ========================= Matching ========================= */
function toUserYears(vehicle?: Vehicle) {
  if (!vehicle?.year) return undefined;
  return [vehicle.year];
}

function matchesListing(listing: Listing, vehicle: Vehicle) {
  if (listing.make && vehicle.make && slug(listing.make) !== slug(vehicle.make)) return false;
  if (listing.model && vehicle.model && slug(listing.model) !== slug(vehicle.model)) return false;
  if (listing.gen && vehicle.gen && slug(listing.gen) !== slug(vehicle.gen)) return false;
  if (listing.engine && vehicle.engine && slug(listing.engine) !== slug(vehicle.engine)) return false;

  const userYears = toUserYears(vehicle);
  if (!yearsOverlap(listing, userYears)) return false;

  if (Array.isArray(listing.compatibility) && listing.compatibility.length) {
    const ok = listing.compatibility.some((c) => {
      const yf = toNum(c.yearFrom);
      const yt = toNum(c.yearTo);
      return (
        sameOrUnknown(c.make, vehicle.make) &&
        sameOrUnknown(c.model, vehicle.model) &&
        sameOrUnknown(c.gen, vehicle.gen) &&
        sameOrUnknown(c.engine, vehicle.engine) &&
        (c.years && c.years.length
          ? c.years.some((y) => (userYears || []).includes(y))
          : yearsOverlap({ yearFrom: yf, yearTo: yt }, userYears))
      );
    });
    if (!ok) return false;
  }

  return true;
}

/* ========================= Page ========================= */
export default function RegistrationPage() {
  const [reg, setReg] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Manual fallbacks
  const [mMake, setMMake] = useState<string>("");
  const [mModel, setMModel] = useState<string>("");
  const [mYear, setMYear] = useState<number | undefined>(undefined);
  const modelOptions = useMemo(() => (mMake && MODELS[mMake] ? MODELS[mMake] : []), [mMake]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await loadListings();
      if (!alive) return;
      setListings(data);
    })();
    return () => { alive = false; };
  }, []);

  const compatible = useMemo(() => {
    if (!vehicle || !Array.isArray(listings)) return [];
    return listings.filter((l) => matchesListing(l, vehicle));
  }, [listings, vehicle]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = normalizeRegInput(reg);
    setReg(cleaned);
    setLoading(true);
    setShowManual(false);

    const v = await lookupByReg(cleaned);
    setLoading(false);

    if (v) {
      setVehicle(v);
    } else {
      // No API result ⇒ manual select
      setVehicle(null);
      setShowManual(true);
    }
  }

  function applyManual() {
    if (!mMake || !mModel || !mYear) {
      alert("Please choose make, model, and year.");
      return;
    }
    const v: Vehicle = { make: mMake, model: mModel, year: mYear };
    setVehicle(v);
    setShowManual(false);
    if (reg.trim()) saveRegMapping(reg, v);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Search by Registration</span>
      </nav>

      {/* Hero / Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-yellow-700" />
          Search by Registration
        </h1>
        <p className="mt-2 text-gray-700 max-w-2xl">
          Enter your UK number plate to find parts that fit. We’ll match make, model and year when possible.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-md bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-yellow-400">
            <Search size={18} className="text-gray-500 mr-2" aria-hidden />
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              placeholder="AB12 CDE"
              value={reg}
              onChange={(e) => setReg(normalizeRegInput(e.target.value))}
              className="w-40 sm:w-56 md:w-64 border-none focus:ring-0 text-[15px] text-[#111] placeholder-gray-500 bg-transparent tracking-wider"
              aria-label="Vehicle registration"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Find my parts
          </button>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black hover:border-yellow-400"
          >
            <Filter className="h-4 w-4" /> Open full search
          </Link>
        </form>

        {/* Manual fallback prompt */}
        {showManual && (
          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">We couldn’t auto-identify that reg (yet).</p>
                <p className="text-sm mt-1">
                  Pick your vehicle below and we’ll filter compatible parts. We’ll remember this for next time.
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                    value={mMake}
                    onChange={(e) => { setMMake(e.target.value); setMModel(""); }}
                  >
                    <option value="">Select make</option>
                    {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <select
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                    value={mModel}
                    onChange={(e) => setMModel(e.target.value)}
                    disabled={!mMake}
                  >
                    <option value="">{mMake ? "Select model" : "Choose make first"}</option>
                    {modelOptions.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
                  </select>

                  <select
                    className="border border-gray-300 rounded-md px-2 py-2 text-sm"
                    value={mYear ?? ""}
                    onChange={(e) => setMYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 40 }).map((_, i) => {
                      const y = 2025 - i; // recent 40 years
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>

                <button
                  onClick={applyManual}
                  className="mt-3 inline-flex items-center rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Use these details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Identified vehicle summary */}
      {vehicle && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <CarIcon className="h-6 w-6 text-yellow-700" />
            <div className="text-sm text-gray-800">
              Searching parts for{" "}
              <span className="font-semibold text-black">
                {vehicle.make || "—"} {vehicle.model || ""}
                {vehicle.gen ? ` • ${vehicle.gen}` : ""}
                {vehicle.year ? ` • ${vehicle.year}` : ""}
                {vehicle.engine ? ` • ${vehicle.engine}` : ""}
              </span>
              {reg ? <span className="text-gray-600"> (Reg: {normalizeRegInput(reg)})</span> : null}
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/profile/me"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black hover:border-yellow-400"
            >
              Manage your garage
            </Link>
          </div>
        </div>
      )}

      {/* Results */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Compatible results</h2>
          {!!compatible?.length && (
            <span className="text-sm text-gray-600">{compatible.length} items</span>
          )}
        </div>

        {!vehicle && (
          <div className="mt-6 text-sm text-gray-600">
            Enter a registration (or use manual vehicle select) to see matching parts.
          </div>
        )}

        {vehicle && Array.isArray(listings) && compatible.length === 0 && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-gray-700">
              No parts found that match your vehicle yet.
            </p>
            <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>Try widening years or removing generation/engine constraints.</li>
              <li>Open the <Link href="/search" className="underline">full search</Link> to explore all parts.</li>
            </ul>
          </div>
        )}

        {vehicle && compatible.length > 0 && (
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
    </section>
  );
}
