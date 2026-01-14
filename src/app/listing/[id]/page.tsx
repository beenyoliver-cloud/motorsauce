// src/app/listing/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import MakeOfferButtonNew from "@/components/MakeOfferButtonNew";
import ContactSellerButton from "@/components/ContactSellerButton";
import ReportListingButton from "@/components/ReportListingButton";
import ListingSEO from "@/components/ListingSEO";
import SellerLink from "@/components/SellerLink";
import SellerExposureTracker from "@/components/SellerExposureTracker";
import TrackRecentlyViewed from "@/components/TrackRecentlyViewed";
import TrustBadge from "@/components/TrustBadge";
import Breadcrumb from "@/components/Breadcrumb";
import SimilarProducts from "@/components/SimilarProducts";
import MoreFromSeller from "@/components/MoreFromSeller";
import VehicleCompatibilityChecker from "@/components/VehicleCompatibilityChecker";
import ListingImageGallery from "@/components/ListingImageGallery";
import SellerActionsBar from "@/components/SellerActionsBar";
import { getCurrentUser } from "@/lib/auth";
import SellerResponseTimeBadge from "@/components/SellerResponseTimeBadge";
// Temporarily disabled: import PriceReducedBadge from "@/components/PriceReducedBadge";
// Temporarily disabled: import PriceHistoryChart from "@/components/PriceHistoryChart";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle, Clock3, ListChecks, MapPin, PlusCircle, ShieldCheck, ShoppingCart, TrendingUp, Truck } from "lucide-react";

// Ensure this page always renders dynamically at runtime on Vercel
export const dynamic = "force-dynamic";
// Ensure Node.js runtime (not Edge) for compatibility with internal fetch + Supabase client
export const runtime = "nodejs";

/* ========== Types ========== */
type Vehicle = {
  make: string;
  model: string;
  year?: number;
  universal?: boolean;
};

type Listing = {
  id: string | number;
  title: string;
  price: string; // e.g. "£120.00"
  image: string;
  images?: string[];
  category: "OEM" | "Aftermarket" | "Tool";
  condition: "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  oem?: string;
  description?: string;
  createdAt: string;
  sellerId?: string;
  seller: { name: string; avatar: string; rating: number; county?: string };
  status?: "active" | "draft" | "sold";
  markedSoldAt?: string;
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
  vehicles?: Vehicle[];
  viewCount?: number;
  shippingOption?: "collection" | "delivery" | "both";
  acceptsReturns?: boolean;
  returnDays?: number;
  quantity?: number;
};

type FitmentKnowledgeEntry = {
  patterns: RegExp[];
  make: string;
  model: string;
  yearRange?: [number, number];
  universal?: boolean;
};

type BMWChassisMeta = {
  make: string;
  defaultModel: string;
  yearRange: [number, number];
  performance?: Record<string, string>;
};

type SellerInsights = {
  id?: string;
  accountType?: string | null;
  businessVerified?: boolean;
  totalSales?: number | null;
  avgResponseTimeMinutes?: number | null;
  responseRate?: number | null;
  totalResponses?: number | null;
  totalInquiries?: number | null;
  county?: string | null;
  country?: string | null;
  createdAt?: string | null;
  specialties?: string[] | null;
};

type PriceAnomalyResult = {
  flagged: boolean;
  medianPrice?: number;
  sampleSize: number;
  priceGapPct?: number;
};

/* ========== Utils ========== */
function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    // Use absolute URL with baseUrl() to ensure proper resolution in server component
    const url = `${baseUrl()}/api/listings?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (res.status === 404) {
      console.warn(`[listing page] single API returned 404 for id=${id}`);
      return null;
    }
    if (!res.ok) {
      // Gracefully handle API errors to avoid application error
      console.error(`[listing page] single API error for id=${id} status=${res.status}`);
      return null;
    }
    const data = (await res.json()) as Listing;
    console.log(`[listing page] single API success for id=${id}`);
    return data;
  } catch (e) {
    // Network or other unexpected error — treat as not found to keep UX stable
    console.error(`[listing page] single API threw for id=${id}:`, e);
    return null;
  }
}

// Fallback: fetch all listings and find by id
async function fetchListingFallback(id: string): Promise<Listing | null> {
  try {
    // Use absolute URL with baseUrl() for server component fetch
    const url = `${baseUrl()}/api/listings?limit=200`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[listing page] fallback API returned status=${res.status}`);
      return null;
    }
    const list = (await res.json()) as unknown;
    if (!Array.isArray(list)) {
      console.warn(`[listing page] fallback API returned non-array`);
      return null;
    }
    const found = (list as any[]).find((l: any) => String(l?.id) === String(id));
    if (found) {
      console.log(`[listing page] using fallback list-and-find for id=${id}`);
    } else {
      console.warn(`[listing page] fallback could not find id=${id} in list of ${list.length} items`);
    }
    return found || null;
  } catch (e) {
    console.error(`[listing page] fallback list-and-find threw for id=${id}:`, e);
    return null;
  }
}

// Final-resort: query Supabase directly from the page (server) if API calls fail
async function fetchListingFromSupabase(id: string): Promise<Listing | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Try direct .eq() first
    const { data: listingData, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    let listing = listingData as any;

    if (error || !listing) {
      // Fallback: fetch a batch and filter client-side
      const { data: all } = await supabase.from("listings").select("*").limit(200);
      listing = (all || []).find((l: any) => String(l.id) === String(id));
    }

    if (!listing) return null;

    // Attach seller profile name if available
  const seller = { name: "Seller", avatar: "/images/seller1.jpg", rating: 5 };
    if (listing.seller_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", listing.seller_id)
        .maybeSingle();
      if (profile?.name) {
        seller.name = profile.name;
      }
    }

    const images: string[] = Array.isArray(listing.images) && listing.images.length
      ? listing.images
      : listing.image_url
      ? [listing.image_url]
      : listing.image
      ? [listing.image]
      : [];

    const mapped: Listing = {
      id: listing.id,
      title: listing.title,
      price: typeof listing.price_cents === "number"
        ? "£" + (listing.price_cents / 100).toFixed(2)
        : typeof listing.price === "number"
        ? "£" + Number(listing.price).toFixed(2)
        : typeof listing.price === "string"
        ? (listing.price.startsWith("£") ? listing.price : `£${listing.price}`)
        : "£0.00",
      image: images[0] || "/images/placeholder.jpg",
      images,
      category: (listing.category as Listing["category"]) || "OEM",
      condition: (listing.condition as Listing["condition"]) || "Used - Good",
      make: listing.make ?? undefined,
      model: listing.model ?? undefined,
      genCode: listing.gen_code ?? listing.genCode ?? undefined,
      engine: listing.engine ?? undefined,
      year: listing.year ? Number(listing.year) : undefined,
      oem: listing.oem ?? undefined,
      description: listing.description ?? "",
      createdAt: listing.created_at || new Date().toISOString(),
      sellerId: listing.seller_id ?? undefined,
      seller,
      status: listing.status ?? "active",
      markedSoldAt: listing.marked_sold_at ?? undefined,
      vin: listing.vin ?? undefined,
      yearFrom: typeof listing.year_from === "number" ? listing.year_from : listing.year_from ? Number(listing.year_from) : undefined,
      yearTo: typeof listing.year_to === "number" ? listing.year_to : listing.year_to ? Number(listing.year_to) : undefined,
      viewCount: typeof listing.view_count === "number" ? listing.view_count : undefined,
      shippingOption: listing.shipping_option ?? undefined,
      acceptsReturns: listing.accepts_returns == null ? undefined : Boolean(listing.accepts_returns),
      returnDays: typeof listing.return_days === "number" ? listing.return_days : listing.return_days ? Number(listing.return_days) : undefined,
      quantity: typeof listing.quantity === "number" ? listing.quantity : listing.quantity ? Number(listing.quantity) : undefined,
      vehicles: Array.isArray(listing.vehicles)
        ? listing.vehicles
        : typeof listing.vehicles === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(listing.vehicles);
              return Array.isArray(parsed) ? parsed : undefined;
            } catch {
              return undefined;
            }
          })()
        : undefined,
    };

    console.log(`[listing page] direct Supabase fetch success for id=${id}`);
    return mapped;
  } catch (e) {
    console.error(`[listing page] direct Supabase fetch threw for id=${id}`);
    return null;
  }
}

const gbpFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function formatGBP(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return null;
  return gbpFormatter.format(amount);
}

function priceToNumber(price?: string | number | null) {
  if (typeof price === "number") return price;
  if (!price) return NaN;
  const value = Number(String(price).replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : NaN;
}

function formatResponseTime(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "New seller";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.max(1, Math.round(hours / 24));
  return `${days}d`;
}

function formatSales(totalSales?: number | null) {
  if (!totalSales || totalSales <= 0) return "—";
  if (totalSales >= 1000) return `${(totalSales / 1000).toFixed(1)}k`;
  return totalSales.toLocaleString("en-GB");
}

function formatShippingOption(option?: Listing["shippingOption"]) {
  switch (option) {
    case "collection":
      return "Collection only";
    case "delivery":
      return "Delivery available";
    case "both":
      return "Delivery or collection";
    default:
      return "Delivery or collection";
  }
}

function formatFulfilmentHelper(option?: Listing["shippingOption"]) {
  switch (option) {
    case "collection":
      return "Arrange collection in Messages";
    case "delivery":
      return "Confirm delivery details at checkout";
    case "both":
      return "Choose collection or delivery at checkout";
    default:
      return "Choose collection or delivery at checkout";
  }
}

function formatReturns(acceptsReturns?: boolean, returnDays?: number | null) {
  if (acceptsReturns === false) {
    return {
      title: "Returns not accepted",
      helper: "Message the seller if you need an exception",
    };
  }
  if (acceptsReturns) {
    const days = typeof returnDays === "number" && returnDays > 0 ? returnDays : 14;
    return {
      title: `Returns accepted within ${days} days`,
      helper: "Start a return in Messages so we can review it",
    };
  }
  return {
    title: "Returns policy not listed",
    helper: "Message the seller before buying",
  };
}

function summariseFitment(listing: Listing) {
  const chips = new Set<string>();
  if (listing.make) chips.add(listing.make);
  if (listing.model) chips.add(listing.model);
  if (listing.genCode) chips.add(`Gen ${listing.genCode}`);
  if (listing.engine) chips.add(listing.engine);
  if (listing.yearFrom && listing.yearTo) chips.add(`${listing.yearFrom}-${listing.yearTo}`);
  else if (listing.year) chips.add(String(listing.year));
  if (listing.oem) chips.add(`OEM ${listing.oem}`);
  if (listing.vin) chips.add(`VIN ${listing.vin}`);
  if (Array.isArray(listing.vehicles)) {
    listing.vehicles.slice(0, 3).forEach((vehicle) => {
      const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
      if (label) chips.add(label);
    });
  }

  const helperParts: string[] = [];
  if (listing.vehicles?.length) {
    helperParts.push(`${listing.vehicles.length}+ vehicle${listing.vehicles.length > 1 ? "s" : ""} verified`);
  } else if (listing.make || listing.model) {
    helperParts.push("Seller provided fitment specifications");
  }
  if (listing.yearFrom && listing.yearTo) helperParts.push(`Covers ${listing.yearFrom}–${listing.yearTo}`);
  if (listing.year && !listing.yearFrom) helperParts.push(`Year ${listing.year}`);
  if (listing.oem) helperParts.push(`OEM ${listing.oem}`);
  const helper =
    helperParts.length > 0
      ? helperParts.join(" • ")
      : "The seller hasn't supplied compatibility data yet.";

  const universal = listing.vehicles?.some((v) => v.universal);
  const confidence = universal
    ? { label: "Universal fit", tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" }
    : listing.vehicles?.length
    ? { label: "Seller confirmed", tone: "bg-blue-50 text-blue-800 border border-blue-200" }
    : listing.make || listing.model
    ? { label: "Specs provided", tone: "bg-amber-50 text-amber-800 border border-amber-200" }
    : { label: "Fitment unknown", tone: "bg-gray-50 text-gray-700 border border-gray-200" };

  return {
    chips: Array.from(chips).slice(0, 8),
    helper,
    confidence,
  };
}

async function fetchSellerInsights(sellerId?: string | null): Promise<SellerInsights | null> {
  if (!sellerId) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, account_type, business_verified, total_sales, avg_response_time_minutes, response_rate, total_responses, total_inquiries_received, county, country, created_at"
      )
      .eq("id", sellerId)
      .maybeSingle();
    if (error || !profile) {
      console.warn("[listing page] No seller profile for insights", { sellerId, error: error?.message });
      return null;
    }
    let specialties: string[] | null = null;
    if (profile.account_type === "business") {
      const { data: businessInfo } = await supabase
        .from("business_info")
        .select("specialties")
        .eq("profile_id", sellerId)
        .maybeSingle();
      if (businessInfo?.specialties && Array.isArray(businessInfo.specialties)) {
        specialties = businessInfo.specialties.filter((entry: unknown): entry is string => typeof entry === "string");
      }
    }
    return {
      id: profile.id,
      accountType: profile.account_type,
      businessVerified: Boolean(profile.business_verified),
      totalSales: profile.total_sales ?? null,
      avgResponseTimeMinutes: profile.avg_response_time_minutes ?? null,
      responseRate: profile.response_rate ?? null,
      totalResponses: profile.total_responses ?? null,
      totalInquiries: profile.total_inquiries_received ?? null,
      county: profile.county ?? null,
      country: profile.country ?? null,
      createdAt: profile.created_at ?? null,
      specialties,
    };
  } catch (error) {
    console.error("[listing page] Seller insights fetch failed", error);
    return null;
  }
}

async function detectPriceAnomaly(listing: Listing): Promise<PriceAnomalyResult> {
  const priceValue = priceToNumber(listing.price);
  if (!Number.isFinite(priceValue)) {
    return { flagged: false, sampleSize: 0 };
  }
  try {
    const url = `${baseUrl()}/api/listings/similar?id=${encodeURIComponent(String(listing.id))}&limit=8`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { flagged: false, sampleSize: 0 };
    }
    const data = (await res.json()) as { similar?: Array<{ price?: string | number }> };
    const prices = (data.similar || [])
      .map((item) => priceToNumber(item.price))
      .filter((value) => Number.isFinite(value)) as number[];

    if (prices.length < 3) {
      return { flagged: false, sampleSize: prices.length };
    }
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
    const priceGapPct = median > 0 ? (median - priceValue) / median : 0;
    const flagged = priceGapPct >= 0.3; // 30% cheaper than peers
    return {
      flagged,
      sampleSize: prices.length,
      medianPrice: median,
      priceGapPct,
    };
  } catch (error) {
    console.error("[listing page] Price anomaly detection failed", error);
    return { flagged: false, sampleSize: 0 };
  }
}

const FITMENT_KNOWLEDGE_BASE: FitmentKnowledgeEntry[] = [
  { patterns: [/e39/i, /\bm5\b/i], make: "BMW", model: "M5", yearRange: [1998, 2003] },
  { patterns: [/e46/i, /\bm3\b/i], make: "BMW", model: "M3", yearRange: [2000, 2006] },
  { patterns: [/e36/i, /\bm3\b/i], make: "BMW", model: "M3", yearRange: [1992, 1999] },
  { patterns: [/e30/i, /\bm3\b/i], make: "BMW", model: "M3", yearRange: [1986, 1991] },
  { patterns: [/e60/i, /\bm5\b/i], make: "BMW", model: "M5", yearRange: [2005, 2010] },
  { patterns: [/golf/i, /\bmk7\b/i], make: "Volkswagen", model: "Golf", yearRange: [2013, 2020] },
  { patterns: [/golf/i, /\bmk6\b/i], make: "Volkswagen", model: "Golf", yearRange: [2009, 2012] },
  { patterns: [/golf/i, /\bmk5\b/i], make: "Volkswagen", model: "Golf", yearRange: [2004, 2009] },
  { patterns: [/rs4\b/i, /\bb7\b/i], make: "Audi", model: "RS4", yearRange: [2006, 2008] },
  { patterns: [/s4\b/i, /\bb8\b/i], make: "Audi", model: "S4", yearRange: [2009, 2016] },
  { patterns: [/rs3\b/i, /\b8v\b/i], make: "Audi", model: "RS3", yearRange: [2015, 2020] },
  { patterns: [/focus\b/i, /\bmk2\b/i, /\brs\b/i], make: "Ford", model: "Focus RS", yearRange: [2009, 2011] },
  { patterns: [/focus\b/i, /\bmk3\b/i, /\brs\b/i], make: "Ford", model: "Focus RS", yearRange: [2016, 2018] },
  { patterns: [/wrx\b/i, /\bgd\b/i], make: "Subaru", model: "WRX", yearRange: [2000, 2007] },
  { patterns: [/civic\b/i, /\bek\b/i], make: "Honda", model: "Civic", yearRange: [1996, 2000] },
  { patterns: [/supra\b/i, /\ba80\b/i], make: "Toyota", model: "Supra", yearRange: [1993, 2002] },
];

const BMW_CHASSIS_CODES: Record<string, BMWChassisMeta> = {
  e30: { make: "BMW", defaultModel: "3 Series", yearRange: [1982, 1994], performance: { m3: "M3" } },
  e36: { make: "BMW", defaultModel: "3 Series", yearRange: [1990, 2000], performance: { m3: "M3" } },
  e38: { make: "BMW", defaultModel: "7 Series", yearRange: [1994, 2001] },
  e39: { make: "BMW", defaultModel: "5 Series", yearRange: [1995, 2003], performance: { m5: "M5" } },
  e46: { make: "BMW", defaultModel: "3 Series", yearRange: [1998, 2006], performance: { m3: "M3" } },
  e60: { make: "BMW", defaultModel: "5 Series", yearRange: [2003, 2010], performance: { m5: "M5" } },
  e63: { make: "BMW", defaultModel: "6 Series", yearRange: [2004, 2010], performance: { m6: "M6" } },
  e90: { make: "BMW", defaultModel: "3 Series", yearRange: [2005, 2011], performance: { m3: "M3" } },
  e92: { make: "BMW", defaultModel: "3 Series", yearRange: [2006, 2013], performance: { m3: "M3" } },
  f10: { make: "BMW", defaultModel: "5 Series", yearRange: [2010, 2016], performance: { m5: "M5" } },
  f80: { make: "BMW", defaultModel: "3 Series", yearRange: [2014, 2018], performance: { m3: "M3" } },
  f82: { make: "BMW", defaultModel: "4 Series", yearRange: [2014, 2020], performance: { m4: "M4" } },
  g80: { make: "BMW", defaultModel: "3 Series", yearRange: [2020, 2025], performance: { m3: "M3" } },
  g82: { make: "BMW", defaultModel: "4 Series", yearRange: [2021, 2025], performance: { m4: "M4" } },
};

function expandVehicleRange(make: string, model: string, yearRange?: [number, number], universal?: boolean): Vehicle[] {
  if (universal) {
    return [{ make, model, universal: true }];
  }
  if (yearRange && Number.isFinite(yearRange[0]) && Number.isFinite(yearRange[1])) {
    const [from, to] = yearRange;
    const vehicles: Vehicle[] = [];
    for (let year = from; year <= to; year++) {
      vehicles.push({ make, model, year });
      if (vehicles.length >= 30) break;
    }
    return vehicles;
  }
  return [{ make, model }];
}

function inferVehiclesFromTitle(listing: Listing): Vehicle[] {
  const text = [
    listing.title,
    listing.description,
    listing.make,
    listing.model,
    listing.genCode,
    listing.engine,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!text) return [];

  const matches: Vehicle[] = [];
  for (const entry of FITMENT_KNOWLEDGE_BASE) {
    if (entry.patterns.every((pattern) => pattern.test(text))) {
      matches.push(...expandVehicleRange(entry.make, entry.model, entry.yearRange, entry.universal));
    }
  }

  const chassisCodes = text.match(/\b[efg]\d{2}\b/g) || [];
  chassisCodes.forEach((codeRaw) => {
    const meta = BMW_CHASSIS_CODES[codeRaw.toLowerCase()];
    if (!meta) return;
    let model = meta.defaultModel;
    if (meta.performance) {
      for (const [hint, label] of Object.entries(meta.performance)) {
        if (new RegExp(`\\b${hint}\\b`, "i").test(text)) {
          model = label;
          break;
        }
      }
    }
    matches.push(...expandVehicleRange(meta.make, model, meta.yearRange));
  });

  if (!matches.length && listing.make && listing.model) {
    if (listing.yearFrom && listing.yearTo) {
      matches.push(...expandVehicleRange(listing.make, listing.model, [listing.yearFrom, listing.yearTo]));
    } else if (listing.year) {
      matches.push({ make: listing.make, model: listing.model, year: listing.year });
    }
  }

  return matches;
}

function mergeVehicles(base?: Vehicle[] | null, extra?: Vehicle[] | null): Vehicle[] {
  const merged: Vehicle[] = [];
  const seen = new Set<string>();
  const add = (vehicle?: Vehicle | null) => {
    if (!vehicle) return;
    const make = vehicle.make?.trim();
    const model = vehicle.model?.trim();
    if (!make && !model && !vehicle.universal) return;
    const key = [
      (make || "").toLowerCase(),
      (model || "").toLowerCase(),
      vehicle.universal ? "universal" : vehicle.year ?? "any",
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(vehicle);
  };
  (base || []).forEach(add);
  (extra || []).forEach(add);
  return merged;
}


/* ========== Metadata ========== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let listing = await fetchListing(id);
  if (!listing) {
    // Fallback to list-and-find to handle prod single-item API quirks
    listing = await fetchListingFallback(id);
  }
  if (!listing) {
    // Final resort: query Supabase directly from this page
    listing = await fetchListingFromSupabase(id);
  }
  if (!listing) {
    return {
      title: "Listing not found | Motorsource",
      description: "This listing could not be found.",
      openGraph: { type: "website", title: "Listing not found | Motorsource" },
    };
  }

  const title = `${listing.title} – ${listing.price} | Motorsource`;
  const desc =
    listing.description?.slice(0, 160) ||
    [listing.category, listing.make, listing.model, listing.genCode, listing.engine, listing.oem]
      .filter(Boolean)
      .join(" • ");

  const images = (listing.images?.length ? listing.images : [listing.image]).map((url) => ({ url }));

  return {
    title,
    description: desc,
    openGraph: {
      type: "website",
      title,
      description: desc,
      images,
      url: `${baseUrl()}/listing/${listing.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: images.map((i) => i.url),
    },
  };
}

/* ========== Page ========== */
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing = await fetchListing(id);
  if (!listing) {
    listing = await fetchListingFallback(id);
  }
  if (!listing) {
    listing = await fetchListingFromSupabase(id);
  }
  if (!listing) notFound();

  // Check if current user is the owner (safely handle auth in server component)
  let isOwner = false;
  try {
    const currentUser = await getCurrentUser();
    isOwner = currentUser?.id === listing.sellerId;
  } catch {
    // User not authenticated or error fetching user - not owner
    isOwner = false;
  }

  // If listing is sold or draft and user is NOT the owner, show 404
  if ((listing.status === "sold" || listing.status === "draft") && !isOwner) {
    notFound();
  }

  const inferredVehicles = inferVehiclesFromTitle(listing);
  const mergedVehicles = mergeVehicles(listing.vehicles, inferredVehicles);
  if (mergedVehicles.length) {
    listing = { ...listing, vehicles: mergedVehicles };
  }

  const [sellerInsights, priceAnomaly] = await Promise.all([
    fetchSellerInsights(listing.sellerId),
    detectPriceAnomaly(listing),
  ]);

  const gallery = listing.images?.length
    ? listing.images
    : listing.image
    ? [listing.image]
    : ["/images/placeholder.jpg"];

  const fitmentSummary = summariseFitment(listing);
  const sellerLocation = sellerInsights?.county || listing.seller?.county || sellerInsights?.country || null;
  const listingPublished = listing.createdAt ? new Date(listing.createdAt) : null;
  const listingMetrics = [
    {
      label: "Views",
      value: typeof listing.viewCount === "number" ? listing.viewCount.toLocaleString("en-GB") : "—",
      helper: "Lifetime on Motorsource",
    },
    {
      label: "Response rate",
      value: sellerInsights?.responseRate ? `${sellerInsights.responseRate}%` : "Building trust",
      helper: "Last 30 days",
    },
    {
      label: "Avg reply",
      value: formatResponseTime(sellerInsights?.avgResponseTimeMinutes),
      helper: sellerInsights?.avgResponseTimeMinutes ? "Seller messaging speed" : "New seller metric",
    },
    {
      label: "Posted",
      value: listingPublished
        ? listingPublished.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })
        : "—",
      helper: listingPublished ? "Listing age" : "",
    },
  ];

  const priceGapPercent = typeof priceAnomaly.priceGapPct === "number" ? Math.round(priceAnomaly.priceGapPct * 100) : null;
  const medianPriceLabel = formatGBP(priceAnomaly.medianPrice) || undefined;
  const responseTimeMinutes = sellerInsights?.avgResponseTimeMinutes;
  const hasResponseTime = typeof responseTimeMinutes === "number" && responseTimeMinutes > 0;
  const responseTimeLabel = hasResponseTime ? formatResponseTime(responseTimeMinutes) : null;
  const responseTimeBadge = hasResponseTime ? `Seller responds in under ${responseTimeLabel}` : "New seller";
  const responseTimeInline = hasResponseTime ? `Seller replies in ${responseTimeLabel}` : "Response time pending";
  const responseTimeDispatch = hasResponseTime ? `Replies in ~${responseTimeLabel}` : "Response time pending";
  const returnsSummary = formatReturns(listing.acceptsReturns, listing.returnDays);
  const fulfilmentLabel = formatShippingOption(listing.shippingOption);
  const fulfilmentHelper = formatFulfilmentHelper(listing.shippingOption);
  const quantityAvailable = typeof listing.quantity === "number" ? listing.quantity : null;
  const availabilityLabel = quantityAvailable !== null ? (quantityAvailable > 0 ? "In stock" : "Out of stock") : "Available now";
  const availabilityTone =
    quantityAvailable !== null && quantityAvailable <= 0
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-green-50 text-green-800 border-green-200";
  const fulfilmentTone = "bg-slate-50 text-slate-700 border-slate-200";
  const yearLabel =
    listing.yearFrom && listing.yearTo
      ? `${listing.yearFrom}-${listing.yearTo}`
      : listing.year
      ? String(listing.year)
      : undefined;
  const itemSpecifics = [
    { label: "Category", value: listing.category },
    { label: "Condition", value: listing.condition },
    { label: "Make", value: listing.make },
    { label: "Model", value: listing.model },
    { label: "Generation", value: listing.genCode },
    { label: "Engine", value: listing.engine },
    { label: "Year", value: yearLabel },
    { label: "OEM", value: listing.oem },
    { label: "VIN", value: listing.vin },
  ].filter((item) => item.value);

  const shippingHighlights = [
    {
      title: "Ships from",
      body: sellerLocation || "United Kingdom",
      helper: sellerLocation ? "Verified via seller profile" : "Seller location not provided",
      icon: MapPin,
    },
    {
      title: "Dispatch updates",
      body: responseTimeDispatch,
      helper: "Stay in Motorsource Messages for delivery updates",
      icon: Clock3,
    },
    {
      title: "Returns",
      body: returnsSummary.title,
      helper: returnsSummary.helper,
      icon: ListChecks,
    },
    {
      title: "Delivery method",
      body: fulfilmentLabel,
      helper: fulfilmentHelper,
      icon: Truck,
    },
  ];
  const sellerDisplayName = listing.seller?.name || "Seller";
  const sellerAvatar = listing.seller?.avatar || "/images/seller1.jpg";
  const sellerMemberSince = sellerInsights?.createdAt
    ? new Date(sellerInsights.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;
  const sellerStats = [
    {
      label: "Total sales",
      value: formatSales(sellerInsights?.totalSales),
      helper: "Across Motorsource",
    },
    {
      label: "Enquiries answered",
      value:
        typeof sellerInsights?.totalResponses === "number"
          ? sellerInsights.totalResponses.toLocaleString("en-GB")
          : "—",
      helper: "Lifetime",
    },
    {
      label: "Member since",
      value: sellerMemberSince || "—",
      helper: "Profile age",
    },
  ];

  const riskFlags: Array<{ title: string; body: string; tone: "amber" | "red" | "blue" }> = [];
  if (priceAnomaly.flagged) {
    riskFlags.push({
      title: "Unusually low price",
      body:
        priceGapPercent && medianPriceLabel
          ? `This part is ${priceGapPercent}% cheaper than the median ${medianPriceLabel}. Double-check fitment and ask for photos in chat.`
          : "Priced significantly lower than similar listings. Verify details before paying.",
      tone: "amber",
    });
  }
  if (!sellerInsights?.businessVerified && (!sellerInsights?.totalSales || sellerInsights.totalSales < 5)) {
    riskFlags.push({
      title: "New seller",
      body: "Few sales on record. Use on-platform chat and checkout so funds stay protected.",
      tone: "amber",
    });
  }
  const descText = listing.description?.toLowerCase() || "";
  const offPlatformHints = ["whatsapp", "telegram", "venmo", "cashapp", "bitcoin", "btc", "bank transfer", "wire"].some((kw) =>
    descText.includes(kw)
  );
  if (offPlatformHints) {
    riskFlags.push({
      title: "Off-platform contact detected",
      body: "Avoid off-platform payments. Keep chat and checkout on Motorsource for protection.",
      tone: "red",
    });
  }
  if (!listing.oem && listing.category === "OEM") {
    riskFlags.push({
      title: "OEM not provided",
      body: "Seller did not include OEM reference. Ask for OEM or VIN before buying.",
      tone: "blue",
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4">
      {/* Track recently viewed (client side) */}
      {/* @ts-ignore Server -> Client component mount */}
      <TrackRecentlyViewed id={listing.id} />
      {/* Track exposure to seller (client side) */}
      {/* @ts-ignore Server -> Client component mount */}
      <SellerExposureTracker sellerName={listing.seller?.name} avatar={listing.seller?.avatar} />
      {/* SEO JSON-LD */}
      <ListingSEO
        id={listing.id}
        title={listing.title}
        description={listing.description || ""}
        priceGBP={Number(String(listing.price).replace(/[^\d.]/g, "")) || 0}
        image={(listing.images?.[0] || listing.image) as string}
        brand={listing.make}
        condition={listing.condition}
        oem={listing.oem}
      />

      {/* Breadcrumbs */}
      <Breadcrumb 
        items={[
          { label: "Search", href: "/search" },
          { label: listing.title }
        ]}
        className="mb-4"
      />

      <div className="mb-3 flex flex-wrap gap-2 sm:gap-3 rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-3 sm:py-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Buyer protection on every checkout
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1 text-xs font-semibold">
          <Clock3 className="h-3.5 w-3.5" />
          {responseTimeBadge}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1 text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5" />
          Ships from {sellerLocation || "United Kingdom"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3">
        {/* ---------- Left column: Gallery + Description + Details (desktop) ---------- */}
        <div className="lg:col-span-2 space-y-4">
          <ListingImageGallery images={gallery} title={listing.title} />
          
          {/* Description (moved higher, desktop left column) */}
          {listing.description && (
            <div className="hidden lg:block rounded-sm border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-black">Description</h2>
              <p className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {itemSpecifics.length > 0 && (
            <div className="hidden lg:block rounded-sm border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-black">Item specifics</h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {itemSpecifics.map((item) => (
                  <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</dt>
                    <dd className="text-sm font-semibold text-gray-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Fitment + analytics (desktop left) */}
          <div className="hidden lg:grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ListChecks className="h-5 w-5 text-gray-800 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-black">Vehicle fitment</h3>
                    <p className="text-xs text-gray-600">{fitmentSummary.helper}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${fitmentSummary.confidence.tone}`}>
                  {fitmentSummary.confidence.label}
                </span>
              </div>
              {fitmentSummary.chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {fitmentSummary.chips.map((chip) => (
                    <span key={chip} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-800">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href="#fitment-checker"
                className="mt-3 inline-flex items-center text-xs font-semibold text-yellow-700 hover:text-yellow-800"
              >
                Deep compatibility check →
              </Link>
            </div>
            <div className="rounded-sm border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-gray-800 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-black">Listing insights</h3>
                  <p className="text-xs text-gray-600">Live marketplace telemetry</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {listingMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</dt>
                    <dd className="text-base font-semibold text-gray-900">{metric.value}</dd>
                    {metric.helper && <p className="text-[11px] text-gray-500 mt-0.5">{metric.helper}</p>}
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Shipping & returns (desktop left) */}
          <div className="hidden lg:block rounded-sm border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-black">Shipping & returns</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {shippingHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-gray-800 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-700">{item.body}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.helper}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk panel (desktop left) */}
          <div className="hidden lg:block rounded-sm border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Stay protected</span>
              <span className="text-xs text-gray-600">On-platform chat & checkout recommended</span>
            </div>
            {riskFlags.length === 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                No issues detected. Pay through Motorsource to keep funds safe.
              </div>
            ) : (
              <div className="space-y-2">
                {riskFlags.map((flag) => (
                  <div
                    key={flag.title}
                    className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 border ${
                      flag.tone === "red"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : flag.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-blue-200 bg-blue-50 text-blue-900"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{flag.title}</p>
                      <p className="text-sm">{flag.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-600">
              Tips: keep conversations in Messages, never pay off-platform, ask for OEM/VIN when unsure, and report anything that feels off.
            </div>
          </div>

          {/* Marketplace safeguards (desktop left) */}
          <div className="hidden lg:block rounded-sm border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-gray-800 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-black">Safety & messaging safeguards</h2>
                <p className="text-xs text-gray-600">Stay inside Motorsource to keep payment protection active.</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Payments held until you confirm delivery or raise a dispute.</li>
              <li>• We monitor chats for off-platform payment requests and intervene on repeat offenders.</li>
              <li>
                • Use the <span className="font-semibold">Report listing</span> button above if anything feels off—the trust desk reviews reports within hours.
              </li>
              {priceAnomaly.flagged && (
                <li>• This listing is already queued for a manual check because of its unusual price.</li>
              )}
            </ul>
          </div>
        </div>

        {/* ---------- Right column: Purchase options + Details ---------- */}
        <div className="space-y-3 sm:space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black leading-tight">{listing.title}</h1>
            <div className="mt-1 text-xs sm:text-sm text-gray-700">
              {listing.category} • {listing.condition}
              {listing.year ? ` • ${listing.year}` : ""}
              {listing.oem ? ` • OEM ${listing.oem}` : ""}
              {(listing.make || listing.model || listing.genCode || listing.engine) && (
                <> • {[listing.make, listing.model, listing.genCode, listing.engine].filter(Boolean).join(" ")}</>
              )}
            </div>
          </div>

          {/* Price + urgency */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">{listing.price}</div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${availabilityTone}`}>
              {availabilityLabel}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${fulfilmentTone}`}>
              {fulfilmentLabel}
            </span>
          </div>

          {/* Description (mobile only) */}
          {listing.description && (
            <div className="lg:hidden rounded-sm border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-black">Description</h2>
              <p className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {itemSpecifics.length > 0 && (
            <div className="lg:hidden rounded-sm border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-black">Item specifics</h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {itemSpecifics.map((item) => (
                  <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</dt>
                    <dd className="text-sm font-semibold text-gray-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Purchase Options (compact) */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-gray-700">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected checkout
              </div>
              <span>Free to message seller before paying</span>
            </div>
            <Link
              href={`/basket/add?listing=${encodeURIComponent(String(listing.id))}&redirect=checkout`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-yellow-400"
            >
              <ShoppingCart className="h-4 w-4" />
              Buy now
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/basket/add?listing=${encodeURIComponent(String(listing.id))}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add to basket
              </Link>
              <ContactSellerButton
                sellerName={listing.seller?.name || "Seller"}
                sellerId={listing.sellerId}
                listingId={listing.id}
                listingTitle={listing.title}
                className="justify-center rounded-lg bg-yellow-500 px-3 py-2.5 text-xs font-semibold text-black hover:bg-yellow-600"
              />
            </div>
            <MakeOfferButtonNew
              sellerName={listing.seller?.name || "Seller"}
              sellerId={listing.sellerId as string}
              listingId={listing.id}
              listingTitle={listing.title}
              listingImage={gallery[0] || listing.image}
              listingPrice={Number(String(listing.price).replace(/[^\d.]/g, "")) || 0}
              className="w-full justify-center rounded-lg border border-yellow-500 bg-white text-sm font-semibold text-gray-900 hover:bg-yellow-50"
            />
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-600" />
                Funds held until delivery confirmed
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-gray-600" />
                {responseTimeInline}
              </div>
              <div className="flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5 text-gray-600" />
                Ask for OEM/VIN in chat before paying
              </div>
            </div>
          </div>

          {/* Save and Report (moved outside purchase box) */}
          <div className="flex gap-2">
            <FavoriteButton
              listingId={String(listing.id)}
              className="flex-1 justify-center text-xs font-medium bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-sm"
            />
            <ReportListingButton
              listingId={listing.id}
              className="flex-1 justify-center text-xs font-medium border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-sm"
            />
          </div>

          {/* Seller Actions Bar (owner only) */}
          {isOwner && (
            <SellerActionsBar
              listingId={listing.id}
              currentStatus={listing.status}
            />
          )}

          {/* Sold badge if listing is sold OR out of stock */}
          {(listing.status === "sold" || (typeof (listing as any).quantity === "number" && (listing as any).quantity <= 0)) && (
            <div className="rounded-sm border-2 border-red-500 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">SOLD</span>
                {listing.markedSoldAt && (
                  <span className="text-sm text-red-600">
                    on {new Date(listing.markedSoldAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-red-700">
                This item has been sold and is no longer available.
              </p>
            </div>
          )}

          {/* Risk panel (mobile only) */}
          <div className="lg:hidden rounded-sm border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Stay protected</span>
              <span className="text-xs text-gray-600">On-platform chat & checkout recommended</span>
            </div>
            {riskFlags.length === 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                No issues detected. Pay through Motorsource to keep funds safe.
              </div>
            ) : (
              <div className="space-y-2">
                {riskFlags.map((flag) => (
                  <div
                    key={flag.title}
                    className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 border ${
                      flag.tone === "red"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : flag.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-blue-200 bg-blue-50 text-blue-900"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{flag.title}</p>
                      <p className="text-sm">{flag.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-600">
              Tips: keep conversations in Messages, never pay off-platform, ask for OEM/VIN when unsure, and report anything that feels off.
            </div>
          </div>

          {/* Fitment + analytics (mobile only) */}
          <div className="lg:hidden grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ListChecks className="h-5 w-5 text-gray-800 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-black">Vehicle fitment</h3>
                    <p className="text-xs text-gray-600">{fitmentSummary.helper}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${fitmentSummary.confidence.tone}`}>
                  {fitmentSummary.confidence.label}
                </span>
              </div>
              {fitmentSummary.chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {fitmentSummary.chips.map((chip) => (
                    <span key={chip} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-800">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href="#fitment-checker"
                className="mt-3 inline-flex items-center text-xs font-semibold text-yellow-700 hover:text-yellow-800"
              >
                Deep compatibility check →
              </Link>
            </div>
            <div className="rounded-sm border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-gray-800 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-black">Listing insights</h3>
                  <p className="text-xs text-gray-600">Live marketplace telemetry</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {listingMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</dt>
                    <dd className="text-base font-semibold text-gray-900">{metric.value}</dd>
                    {metric.helper && <p className="text-[11px] text-gray-500 mt-0.5">{metric.helper}</p>}
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Shipping & returns (mobile only) */}
          <div className="lg:hidden rounded-sm border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-black">Shipping & returns</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shippingHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-gray-800 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-700">{item.body}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.helper}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace safeguards (mobile only) */}
          <div className="lg:hidden rounded-sm border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-800 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-black">Safety & messaging safeguards</h2>
                <p className="text-xs text-gray-600">Stay inside Motorsource to keep payment protection active.</p>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>• Payments held until you confirm delivery or raise a dispute.</li>
              <li>• We monitor chats for off-platform payment requests and intervene on repeat offenders.</li>
              <li>
                • Use the <span className="font-semibold">Report listing</span> button above if anything feels off—the trust desk reviews reports within hours.
              </li>
              {priceAnomaly.flagged && (
                <li>• This listing is already queued for a manual check because of its unusual price.</li>
              )}
            </ul>
          </div>

          {/* Seller card */}
          <div className="rounded-sm border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-start gap-3">
              <SellerLink
                sellerName={sellerDisplayName}
                sellerId={listing.sellerId}
                className="flex items-start gap-3 group flex-1"
              >
                <SafeImage
                  src={sellerAvatar}
                  alt={sellerDisplayName}
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-black group-hover:underline truncate">
                      {sellerDisplayName}
                    </div>
                    <TrustBadge soldCount={sellerInsights?.totalSales} />
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {Number(listing.seller.rating).toFixed(1)}
                    </span>
                    {sellerLocation && (
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {sellerLocation}
                      </span>
                    )}
                    {sellerInsights?.businessVerified && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Verified business
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-500">
                    {sellerInsights?.accountType && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {sellerInsights.accountType === "business" ? "Business seller" : "Individual seller"}
                      </span>
                    )}
                    {typeof sellerInsights?.totalInquiries === "number" && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {sellerInsights.totalInquiries.toLocaleString("en-GB")} inquiries handled
                      </span>
                    )}
                  </div>
                </div>
              </SellerLink>
            </div>
            {sellerInsights?.avgResponseTimeMinutes !== null && sellerInsights?.avgResponseTimeMinutes !== undefined && (
              <SellerResponseTimeBadge
                avgResponseTimeMinutes={sellerInsights.avgResponseTimeMinutes}
                responseRate={sellerInsights.responseRate}
                size="sm"
              />
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {sellerStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{stat.label}</div>
                  <div className="text-base font-semibold text-gray-900">{stat.value}</div>
                  <p className="text-[11px] text-gray-500">{stat.helper}</p>
                </div>
              ))}
            </div>
            {sellerInsights?.specialties && sellerInsights.specialties.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Specialties</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sellerInsights.specialties.slice(0, 6).map((topic) => (
                    <span key={topic} className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Link
                href={`/profile/${encodeURIComponent(sellerDisplayName)}`}
                className="text-xs font-semibold text-yellow-700 hover:text-yellow-800"
              >
                View seller profile →
              </Link>
              {sellerInsights?.businessVerified && (
                <span className="text-[11px] text-gray-500">Docs verified by Motorsource</span>
              )}
            </div>
          </div>

          {/* Vehicle Compatibility Checker */}
          {(listing.vehicles?.length || listing.make || listing.model) && (
            <div id="fitment-checker" className="scroll-mt-24">
              <VehicleCompatibilityChecker
                vehicles={listing.vehicles}
                universal={listing.vehicles?.some(v => v.universal)}
              />
            </div>
          )}
        </div>
      </div>

      <MoreFromSeller
        sellerId={listing.sellerId}
        sellerName={sellerDisplayName}
        listingId={listing.id}
      />

      {/* Related Parts - full width at bottom */}
      <SimilarProducts listingId={listing.id} limit={6} />
    </section>
  );
}
