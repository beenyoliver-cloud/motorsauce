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
import VehicleCompatibilityChecker from "@/components/VehicleCompatibilityChecker";
import ListingImageGallery from "@/components/ListingImageGallery";
import SellerActionsBar from "@/components/SellerActionsBar";
import { getCurrentUser } from "@/lib/auth";
// Temporarily disabled: import PriceReducedBadge from "@/components/PriceReducedBadge";
// Temporarily disabled: import PriceHistoryChart from "@/components/PriceHistoryChart";
import { createClient } from "@supabase/supabase-js";

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
  seller: { name: string; avatar: string; rating: number };
  status?: "active" | "draft" | "sold";
  markedSoldAt?: string;
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
  vehicles?: Vehicle[];
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
      vin: listing.vin ?? undefined,
      yearFrom: typeof listing.year_from === "number" ? listing.year_from : listing.year_from ? Number(listing.year_from) : undefined,
      yearTo: typeof listing.year_to === "number" ? listing.year_to : listing.year_to ? Number(listing.year_to) : undefined,
    };

    console.log(`[listing page] direct Supabase fetch success for id=${id}`);
    return mapped;
  } catch (e) {
    console.error(`[listing page] direct Supabase fetch threw for id=${id}`);
    return null;
  }
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

  const gallery = listing.images?.length ? listing.images : [listing.image];

  return (
    <section className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
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

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-2">
        {/* ---------- Gallery ---------- */}
        <ListingImageGallery images={gallery} title={listing.title} />

        {/* ---------- Details ---------- */}
        <div className="space-y-3 sm:space-y-4">
          {/* Title + Save */}
          <div className="flex items-start justify-between gap-2 sm:gap-3">
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
            <FavoriteButton listingId={String(listing.id)} />
          </div>

          {/* Price + Badge */}
          <div className="space-y-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{listing.price}</div>
            {/* Temporarily disabled: <PriceReducedBadge listingId={String(listing.id)} /> */}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/basket/add?listing=${encodeURIComponent(String(listing.id))}&redirect=checkout`}
              className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-2.5 font-semibold text-black hover:bg-yellow-600"
            >
              Buy now
            </Link>
            <Link
              href={`/basket/add?listing=${encodeURIComponent(String(listing.id))}`}
              className="inline-flex items-center justify-center rounded-md border border-gray-500 bg-white px-5 py-2.5 text-gray-900 hover:bg-gray-100"
            >
              Add to basket
            </Link>

            {/* Make Offer (persistent messaging; auto-disables on own listing) */}
            <MakeOfferButtonNew
              sellerName={listing.seller?.name || "Seller"}
              sellerId={listing.sellerId as string}
              listingId={listing.id}
              listingTitle={listing.title}
              listingImage={gallery[0] || listing.image}
              listingPrice={Number(String(listing.price).replace(/[^\d.]/g, "")) || 0}
            />

            {/* Contact Seller (auto-disables on own listing) */}
            <ContactSellerButton
              sellerName={listing.seller?.name || "Seller"}
              sellerId={listing.sellerId}
              listingId={listing.id}
              listingTitle={listing.title}
            />

            {/* Report listing (Trust & Safety MVP) */}
            <ReportListingButton listingId={listing.id} />
          </div>

          {/* Seller Actions Bar (owner only) */}
          {isOwner && (
            <SellerActionsBar
              listingId={listing.id}
              currentStatus={listing.status}
            />
          )}

          {/* Sold badge if listing is sold */}
          {listing.status === "sold" && (
            <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4">
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

          {/* Shipping & returns */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-black">Shipping & returns</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gray-900" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Shipping</div>
                  <div className="text-sm text-gray-700">Calculated at checkout • Tracked delivery</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gray-900" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Delivery time</div>
                  <div className="text-sm text-gray-700">Typically 2–5 business days (seller dispatch varies)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gray-900" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Returns</div>
                  <div className="text-sm text-gray-700">Seller-led returns • Contact seller via Messages</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gray-900" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Buyer protection</div>
                  <div className="text-sm text-gray-700">Secure checkout • Funds released after you confirm</div>
                </div>
              </div>
            </div>
          </div>

          {/* Seller card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-black">Seller</h2>
            <div className="flex items-start gap-3">
              {/* Avatar + name clickable; prefers /profile/{id} if sellerId present */}
              <SellerLink
                sellerName={listing.seller.name}
                sellerId={listing.sellerId}
                className="flex items-start gap-3 group flex-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.seller.avatar}
                  alt={listing.seller.name}
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-black group-hover:underline truncate">
                    {listing.seller.name}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                    <span>⭐ {Number(listing.seller.rating).toFixed(1)}</span>
                    {/* Trust badge placeholder; soldCount to be wired from metrics later */}
                    <TrustBadge soldCount={undefined} />
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Usually responds within 24 hours</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Active seller since {new Date(listing.createdAt).getFullYear()}</span>
                    </div>
                  </div>
                </div>
              </SellerLink>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link
                href={`/profile/${encodeURIComponent(listing.seller.name)}`}
                className="text-xs font-medium text-yellow-600 hover:text-yellow-700 hover:underline"
              >
                View seller profile →
              </Link>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-black">Description</h2>
              <p className="whitespace-pre-line text-sm text-gray-800">{listing.description}</p>
            </div>
          )}

          {/* Vehicle Compatibility Checker */}
          {(listing.vehicles?.length || listing.make || listing.model) && (
            <VehicleCompatibilityChecker
              vehicles={listing.vehicles}
              universal={listing.vehicles?.some(v => v.universal)}
            />
          )}

          {/* Price History Chart */}
          {/* Temporarily disabled: <PriceHistoryChart listingId={String(listing.id)} /> */}
        </div>
      </div>

      {/* Similar Products */}
      <SimilarProducts listingId={listing.id} limit={6} />
    </section>
  );
}
