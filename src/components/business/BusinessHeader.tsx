"use client";

import { useState } from "react";
import Link from "next/link";
import { BusinessProfile } from "./BusinessStorefront";
import { Building2, CheckCircle, Settings } from "lucide-react";

type Props = {
  business: BusinessProfile;
  isOwner: boolean;
};

export default function BusinessHeader({ business, isOwner }: Props) {
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  const bannerUrl = business.banner_url;
  const logoUrl = business.logo_url || business.avatar;

  return (
    <div className="bg-white">
      {/* Banner Image - Reduced height on mobile for better UX */}
      <div className="relative h-[180px] md:h-[320px] w-full bg-gradient-to-r from-gray-800 to-gray-600 border-b border-gray-200 overflow-hidden">
        {bannerUrl && !bannerError && (
          <img
            src={bannerUrl}
            alt={`${business.business_name} banner`}
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={() => setBannerError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />
        {isOwner && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <Link
              href="/settings/business"
              className="bg-white/90 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-md shadow hover:bg-white text-xs md:text-sm font-medium"
            >
              <Settings className="w-3 h-3 md:hidden inline" />
              <span className="hidden md:inline">Edit banner</span>
            </Link>
          </div>
        )}
      </div>

      {/* Business Info - Improved mobile layout */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 -mt-12 md:-mt-16 relative z-10 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-4">
          {/* Logo - Smaller on mobile */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-32 md:h-32 rounded-lg md:rounded-xl bg-white shadow-lg md:shadow-xl border-2 md:border-4 border-white overflow-hidden">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={`${business.business_name} logo`}
                  className="w-full h-full object-cover object-center"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Building2 className="w-8 h-8 md:w-16 md:h-16 text-gray-400" />
                </div>
              )}
            </div>
            {isOwner && (
              <div className="mt-1 md:mt-2">
                <Link href="/settings/business" className="inline-block text-xs text-gray-600 hover:text-gray-900 underline">Edit logo</Link>
              </div>
            )}
          </div>

          {/* Business Name and Details - Compact on mobile */}
          <div className="flex-1 bg-white rounded-lg shadow-lg p-3 md:p-6 w-full">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                    {business.business_name}
                  </h1>
                  {business.business_verified && (
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 md:py-1 rounded-full text-xs font-medium w-fit">
                      <CheckCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">Verified</span>
                      <span className="sm:hidden">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="capitalize">
                      {business.business_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {business.years_established && (
                    <span className="whitespace-nowrap">Est. {business.years_established}</span>
                  )}
                  <span className="whitespace-nowrap">{business.total_sales} sales</span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            {business.specialties && business.specialties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {business.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
