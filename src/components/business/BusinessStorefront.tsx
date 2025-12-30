"use client";

import Link from "next/link";
import { CSSProperties, useState, useMemo, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import BusinessHeader from "./BusinessHeader";
import BusinessStats from "./BusinessStats";
import BusinessAbout from "./BusinessAbout";
import BusinessCatalogue from "./BusinessCatalogue";
import BusinessReviews from "./BusinessReviews";
import BusinessContact from "./BusinessContact";
import BusinessInsights from "./BusinessInsights";
import { Boxes, Info, Star as StarIcon, PhoneCall, ChartBar, ShieldCheck, Settings as SettingsIcon, UploadCloud } from "lucide-react";

export type BusinessProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  business_verified: boolean;
  total_sales: number;
  avg_response_time_minutes: number | null;
  response_rate: number | null;
  member_since: string;
  
  // Business info
  business_name: string;
  business_type: string;
  logo_url: string | null;
  banner_url: string | null;
  phone_number: string | null;
  website_url: string | null;
  customer_support_email: string | null;
  opening_hours: any;
  customer_service_hours: any;
  about_business: string | null;
  specialties: string[] | null;
  years_established: number | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_accent_color?: string | null;
  
  // Aggregated ratings
  avg_rating: number;
  review_count: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
};

type Tab = 'catalogue' | 'about' | 'reviews' | 'contact';

type Props = {
  business: BusinessProfile;
  isOwner: boolean;
};

export default function BusinessStorefront({ business, isOwner }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('catalogue');
  const [theme, setTheme] = useState({
    primary: business.brand_primary_color || "#facc15",
    secondary: business.brand_secondary_color || "#0f172a",
    accent: business.brand_accent_color || "#fde68a",
  });
  const themeStyles: CSSProperties = useMemo(
    () =>
      ({
        "--brand-primary": theme.primary,
        "--brand-secondary": theme.secondary,
        "--brand-accent": theme.accent,
      }) as CSSProperties,
    [theme]
  );
  const handleColorsDetected = useCallback(
    (colors: { primary: string; secondary: string; accent: string }) => {
      setTheme((prev) =>
        prev.primary === colors.primary && prev.secondary === colors.secondary ? prev : colors
      );
    },
    []
  );
  const [ownerListings, setOwnerListings] = useState<Array<{ id: string | number; price?: number | string; created_at?: string; view_count?: number; oem?: string | null; images?: string[] }>>([]);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings?seller_id=${business.id}&limit=200`, { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setOwnerListings(data as any);
          }
        }
      } catch (err) {
        console.error("[BusinessStorefront] Failed to load owner listings", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [business.id, isOwner]);

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: 'catalogue', label: 'Catalogue', icon: <Boxes className="h-4 w-4" /> },
    { id: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
    ...(business.review_count > 0 ? [{ id: 'reviews' as const, label: `Reviews (${business.review_count})`, icon: <StarIcon className="h-4 w-4" /> }] : []),
    { id: 'contact', label: 'Contact', icon: <PhoneCall className="h-4 w-4" /> },
  ];

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://motorsauce.vercel.app';
  const businessUrl = `${siteUrl}/profile/${encodeURIComponent(business.name)}`;
  const logo = business.logo_url || business.avatar || undefined;
  const banner = business.banner_url || undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: business.business_name,
    url: businessUrl,
    logo,
    image: banner,
    email: business.customer_support_email || undefined,
    telephone: business.phone_number || undefined,
    sameAs: business.website_url ? [business.website_url] : undefined,
  };
  const specialtyCollections =
    (business.specialties && business.specialties.length > 0
      ? business.specialties
      : ["Performance", "OEM sourcing", "Detailing", "Wheels & tyres"]
    ).slice(0, 4);

  return (
    <div className="min-h-screen bg-white pt-4 sm:pt-6" style={themeStyles}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Business Header with Banner */}
      <BusinessHeader business={business} isOwner={isOwner} onColorsDetected={handleColorsDetected} />

      {/* Stats Bar */}
      <div className="relative mt-4 md:mt-12 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <BusinessStats business={business} className="rounded-3xl shadow-2xl border border-white/10 overflow-hidden" />
        </div>
      </div>

      {/* Highlights */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About the shop</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {business.about_business && business.about_business.trim().length > 0
              ? business.about_business.slice(0, 180) + (business.about_business.length > 180 ? "…" : "")
              : "This business hasn’t shared their story yet. Browse their catalogue or contact them for more details."}
          </p>
          <Link href="#about" className="text-sm font-semibold text-yellow-600 hover:text-yellow-700">
            Learn more →
          </Link>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialities</p>
          <div className="flex flex-wrap gap-2">
            {(business.specialties && business.specialties.length > 0
              ? business.specialties
              : ["OEM sourcing", "Fast dispatch", "Verified seller"]
            ).slice(0, 6).map((chip) => (
              <span key={chip} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer care</p>
          <p className="text-sm text-gray-700">
            Avg response time:{" "}
            <span className="font-semibold">
              {business.avg_response_time_minutes ? `${Math.round((business.avg_response_time_minutes || 0) / 60)}h` : "New seller"}
            </span>
          </p>
          <p className="text-sm text-gray-700">
            Response rate:{" "}
            <span className="font-semibold">
              {business.response_rate ? `${business.response_rate}%` : "Building reputation"}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Contact them any time via Motorsauce chat or their preferred channels.
          </p>
        </div>
      </div>

      {/* Featured collections - Disabled for now, will be used later
      {specialtyCollections.length > 0 && (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Featured collections</h3>
          <Link href="#catalogue" className="text-sm text-yellow-600 hover:text-yellow-700">
            Browse catalogue →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {specialtyCollections.map((collection) => (
              <Link
                key={collection}
                href={`/search?q=${encodeURIComponent(collection)}`}
                className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[var(--brand-secondary,#0f172a)]/90 to-[var(--brand-secondary,#0f172a)]/60 text-white px-4 py-5 shadow hover:shadow-lg transition"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Collection</p>
                <p className="mt-1 text-xl font-semibold">{collection}</p>
                <p className="text-sm text-white/80 mt-2">Tap to view curated stock tagged for this specialty.</p>
              </Link>
            ))}
          </div>
        </div>
      )}
      */}

      {/* Owner Quick Links + Insights */}
      {isOwner && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/analytics"
              className="rounded-lg border border-gray-200 bg-white p-4 flex items-start gap-3 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                <ChartBar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Analytics</p>
                <p className="text-xs text-gray-600">Views, offers, and performance metrics</p>
              </div>
            </Link>
            <Link
              href="/settings/business"
              className="rounded-lg border border-gray-200 bg-white p-4 flex items-start gap-3 hover:shadow-sm transition"
            >
              <div className="p-2 rounded-md bg-gray-50 text-gray-800">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Business Settings</p>
                <p className="text-xs text-gray-600">Branding, compliance, bulk uploads, and more</p>
              </div>
            </Link>
          </div>

          {ownerListings.length > 0 && (
            <BusinessInsights listings={ownerListings} />
          )}
        </div>
      )}

      {business.review_count > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 flex flex-col lg:flex-row gap-4 shadow">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Testimonials</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                Loved by {business.review_count}+ customers
              </p>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Buyers frequently mention fast responses and carefully packaged parts. Explore their reviews to see recent feedback.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <span key={i} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-semibold border border-white shadow">
                    {i}
                  </span>
                ))}
              </div>
              <Link
                href="#reviews"
                className="ml-auto inline-flex items-center justify-center rounded-full bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
              >
                Read reviews
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <nav className="flex space-x-3 overflow-x-auto py-2" role="tablist" aria-label="Business sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400 ${
                  activeTab === tab.id
                    ? 'bg-[var(--brand-primary)] text-black border-[var(--brand-primary)] shadow ring-1 ring-black/10'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-yellow-500 transition-opacity ${
                    activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                  }`}
                />
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8">
        {activeTab === 'catalogue' && (
          <div id="catalogue-panel" role="tabpanel" aria-labelledby="catalogue-tab">
            <BusinessCatalogue businessId={business.id} isOwner={isOwner} />
          </div>
        )}
        {activeTab === 'about' && (
          <div id="about-panel" role="tabpanel" aria-labelledby="about-tab">
            <BusinessAbout business={business} />
          </div>
        )}
        {activeTab === 'reviews' && (
          <div id="reviews-panel" role="tabpanel" aria-labelledby="reviews-tab">
            <BusinessReviews businessId={business.id} business={business} />
          </div>
        )}
        {activeTab === 'contact' && (
          <div id="contact-panel" role="tabpanel" aria-labelledby="contact-tab">
            <BusinessContact business={business} />
          </div>
        )}
      </div>
    </div>
  );
}
