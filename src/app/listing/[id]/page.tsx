// src/app/listing/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import MakeOfferButton from "@/components/MakeOfferButton";
import ContactSellerButton from "@/components/ContactSellerButton";
import ReportListingButton from "@/components/ReportListingButton";
import ListingSEO from "@/components/ListingSEO";
import SellerLink from "@/components/SellerLink";
import SellerExposureTracker from "@/components/SellerExposureTracker";

/* ========== Types ========== */
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
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
};

/* ========== Utils ========== */
function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchListing(id: string): Promise<Listing | null> {
  const res = await fetch(`${baseUrl()}/api/listings?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch listing ${id}`);
  return (await res.json()) as Listing;
}

/* ========== Metadata ========== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    return {
      title: "Listing not found | Motorsauce",
      description: "This listing could not be found.",
      openGraph: { type: "website", title: "Listing not found | Motorsauce" },
    };
  }

  const title = `${listing.title} – ${listing.price} | Motorsauce`;
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
  const listing = await fetchListing(id);
  if (!listing) notFound();

  const gallery = listing.images?.length ? listing.images : [listing.image];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
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
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-yellow-600">Search</Link>
        <span className="mx-2">/</span>
        <span className="line-clamp-1 text-gray-800">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ---------- Gallery ---------- */}
        <div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <SafeImage
              src={gallery[0]}
              alt={listing.title}
              className="h-full w-full object-contain"
              loading="eager"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.slice(1, 6).map((img, i) => (
                <div
                  key={`${img}-${i}`}
                  className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <SafeImage
                    src={img}
                    alt={`${listing.title} thumbnail ${i + 2}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Details ---------- */}
        <div className="space-y-4">
          {/* Title + Save */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-black">{listing.title}</h1>
              <div className="mt-1 text-sm text-gray-700">
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

          {/* Price */}
          <div className="text-3xl font-extrabold text-gray-900">{listing.price}</div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/checkout?listing=${encodeURIComponent(String(listing.id))}`}
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

            {/* Make Offer (auto-disables on own listing via component logic) */}
            <MakeOfferButton
              sellerName={listing.seller?.name || "Seller"}
              listingId={listing.id}
              listingTitle={listing.title}
              listingImage={gallery[0] || listing.image}
            />

            {/* Contact Seller (auto-disables on own listing) */}
            <ContactSellerButton
              sellerName={listing.seller?.name || "Seller"}
              listingId={listing.id}
              listingTitle={listing.title}
            />

            {/* Report listing (Trust & Safety MVP) */}
            <ReportListingButton listingId={listing.id} />
          </div>

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
            <div className="flex items-center justify-between gap-3">
              {/* Avatar + name clickable; prefers /profile/{id} if sellerId present */}
              <SellerLink
                sellerName={listing.seller.name}
                sellerId={listing.sellerId}
                className="flex items-center gap-3 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.seller.avatar}
                  alt={listing.seller.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-black group-hover:underline">
                    {listing.seller.name}
                  </div>
                  <div className="text-xs text-gray-600">⭐ {Number(listing.seller.rating).toFixed(1)}</div>
                </div>
              </SellerLink>

              <Link
                href={`/messages/new?to=${encodeURIComponent(listing.seller.name)}&ref=${encodeURIComponent(
                  String(listing.id)
                )}`}
                className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
              >
                Message seller
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
        </div>
      </div>
    </section>
  );
}
