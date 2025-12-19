"use client";

import { CSSProperties, useState } from "react";
import BusinessHeader from "./BusinessHeader";
import BusinessStats from "./BusinessStats";
import BusinessAbout from "./BusinessAbout";
import BusinessCatalogue from "./BusinessCatalogue";
import BusinessReviews from "./BusinessReviews";
import BusinessContact from "./BusinessContact";

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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'catalogue', label: 'Catalogue', icon: '' },
    { id: 'about', label: 'About', icon: '' },
    { id: 'reviews', label: `Reviews (${business.review_count})`, icon: '' },
    { id: 'contact', label: 'Contact', icon: '' },
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
      <BusinessStats business={business} />

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-[var(--brand-primary)]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
                style={{ borderColor: activeTab === tab.id ? "var(--brand-primary)" : undefined }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
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
