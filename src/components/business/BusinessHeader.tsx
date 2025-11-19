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
      {/* Banner Image (slim, top-only) */}
      <div className="relative h-16 md:h-20 lg:h-24 w-full bg-gradient-to-r from-gray-800 to-gray-600 border-b border-gray-200">
        {bannerUrl && !bannerError && (
          <img
            src={bannerUrl}
            alt={`${business.business_name} banner`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setBannerError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
        {isOwner && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <Link
              href="/settings/business"
              className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow hover:bg-white text-sm font-medium"
            >
              Edit banner
            </Link>
          </div>
        )}
      </div>

      {/* Business Info Overlay */}
      <div className="max-w-7xl mx-auto px-4 mt-0 relative z-10 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-xl bg-white shadow-xl border-4 border-white overflow-hidden">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={`${business.business_name} logo`}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            {isOwner && (
              <div className="mt-2">
                <Link href="/settings/business" className="inline-block text-xs text-gray-600 hover:text-gray-900 underline">Edit logo</Link>
              </div>
            )}
          </div>

          {/* Business Name and Details */}
          <div className="flex-1 bg-white rounded-lg shadow-lg p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {business.business_name}
                  </h1>
                  {business.business_verified && (
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span className="capitalize">
                      {business.business_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {business.years_established && (
                    <span>Est. {business.years_established}</span>
                  )}
                  <span>{business.total_sales} sales</span>
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
