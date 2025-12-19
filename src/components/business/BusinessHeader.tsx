"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { BusinessProfile } from "./BusinessStorefront";
import { Building2, CheckCircle, Settings, Phone, Globe, Mail } from "lucide-react";

type Props = {
  business: BusinessProfile;
  isOwner: boolean;
  onColorsDetected?: (colors: { primary: string; secondary: string; accent: string }) => void;
};

export default function BusinessHeader({ business, isOwner, onColorsDetected }: Props) {
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [detectedColors, setDetectedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const primary = business.brand_primary_color || detectedColors?.primary || "#facc15";
  const secondary = business.brand_secondary_color || detectedColors?.secondary || "#0f172a";
  const accent = business.brand_accent_color || detectedColors?.accent || "#fde68a";
  const quickActions = quickActionButtons(business);
  
  const bannerUrl = business.banner_url;
  const logoUrl = business.logo_url || business.avatar;

  useEffect(() => {
    if (!logoUrl || business.brand_primary_color || !onColorsDetected) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => {
      if (cancelled) return;
      const palette = extractPalette(img);
      if (palette) {
        setDetectedColors(palette);
        onColorsDetected(palette);
      }
    };
    return () => {
      cancelled = true;
    };
  }, [logoUrl, business.brand_primary_color, onColorsDetected]);

  return (
    <div className="bg-white">
      {/* Banner Image - Reduced height on mobile for better UX */}
      <div
        className="relative h-[180px] md:h-[320px] w-full border-b border-gray-200 overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${secondary}, #020617)` }}
      >
        {bannerUrl && !bannerError && (
          <img
            src={bannerUrl}
            alt={`${business.business_name} banner`}
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={() => setBannerError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
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
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 md:py-1 rounded-full text-xs font-medium w-fit"
                      style={{ backgroundColor: primary, color: secondary }}
                    >
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
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: accent, color: secondary }}
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
            {quickActions.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {quickActions.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noreferrer" : undefined}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 hover:border-yellow-400 transition"
                  >
                    {action.icon}
                    {action.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function quickActionButtons(business: BusinessProfile) {
  const items: Array<{ label: string; href: string; icon: ReactNode; external?: boolean }> = [];
  if (business.phone_number) {
    items.push({
      label: "Call shop",
      href: `tel:${business.phone_number}`,
      icon: <Phone className="h-4 w-4 text-gray-700" />,
    });
  }
  if (business.customer_support_email) {
    items.push({
      label: "Email support",
      href: `mailto:${business.customer_support_email}`,
      icon: <Mail className="h-4 w-4 text-gray-700" />,
    });
  }
  if (business.website_url) {
    items.push({
      label: "Visit website",
      href: business.website_url,
      icon: <Globe className="h-4 w-4 text-gray-700" />,
      external: true,
    });
  }
  return items;
}

function extractPalette(image: HTMLImageElement) {
  try {
    const canvas = document.createElement("canvas");
    const maxSize = 80;
    const ratio = Math.max(image.width, image.height) / maxSize || 1;
    canvas.width = Math.max(1, Math.floor(image.width / ratio));
    canvas.height = Math.max(1, Math.floor(image.height / ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 50) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (!count) return null;
    const avg = {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    };
    const primary = rgbToCss(avg);
    const secondary = rgbToCss(darken(avg, 30));
    const accent = rgbToCss(lighten(avg, 30));
    return { primary, secondary, accent };
  } catch {
    return null;
  }
}

function rgbToCss({ r, g, b }: { r: number; g: number; b: number }) {
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function darken(color: { r: number; g: number; b: number }, amount: number) {
  return {
    r: clamp(color.r - amount),
    g: clamp(color.g - amount),
    b: clamp(color.b - amount),
  };
}

function lighten(color: { r: number; g: number; b: number }, amount: number) {
  return {
    r: clamp(color.r + amount),
    g: clamp(color.g + amount),
    b: clamp(color.b + amount),
  };
}
