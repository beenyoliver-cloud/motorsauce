"use client";

import Link from "next/link";
import { CSSProperties, useState } from "react";
import BusinessHeader from "./BusinessHeader";
import BusinessStats from "./BusinessStats";
import BusinessAbout from "./BusinessAbout";
import BusinessCatalogue from "./BusinessCatalogue";
import BusinessReviews from "./BusinessReviews";
import BusinessContact from "./BusinessContact";
import { Boxes, Info, Star as StarIcon, PhoneCall } from "lucide-react";

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
  const themeStyles: CSSProperties = {
    "--brand-primary": business.brand_primary_color || "#facc15",
    "--brand-secondary": business.brand_secondary_color || "#0f172a",
    "--brand-accent": business.brand_accent_color || "#fde68a",
  } as CSSProperties;

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'catalogue', label: 'Catalogue', icon: <Boxes className="h-4 w-4" /> },
    { id: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
    { id: 'reviews', label: `Reviews (${business.review_count})`, icon: <StarIcon className="h-4 w-4" /> },
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

  return (
    <div className="min-h-screen bg-white" style={themeStyles}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Business Header with Banner */}
      <BusinessHeader business={business} isOwner={isOwner} />

      {/* Stats Bar */}
      <div className="relative -mt-10 px-4">
        <div className="max-w-7xl mx-auto">
          <BusinessStats business={business} className="rounded-3xl shadow-2xl border border-white/10 overflow-hidden" />
        </div>
      </div>

      {/* Highlights */}
      <div className="max-w-7xl mx-auto px-4 mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-4 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-[var(--brand-primary)] text-black border-[var(--brand-primary)] shadow'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'catalogue' && <BusinessCatalogue businessId={business.id} isOwner={isOwner} />}
        {activeTab === 'about' && <BusinessAbout business={business} />}
        {activeTab === 'reviews' && <BusinessReviews businessId={business.id} business={business} />}
        {activeTab === 'contact' && <BusinessContact business={business} />}
      </div>
    </div>
  );
}
