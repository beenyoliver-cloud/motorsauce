"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import FavoriteButton from "@/components/FavoriteButton";
import { CheckCircle2, TrendingDown, MapPin, Star, Package, Eye, Heart } from "lucide-react";

type ListingCardProps = {
  id: string | number;
  title: string;
  price: string | number;
  image: string;
  images?: string[];
  category?: string;
  condition?: string;
  make?: string;
  model?: string;
  year?: number;
  oem?: string;
  status?: string;
  createdAt?: string;
  previousPrice?: number;
  seller?: {
    name?: string;
    avatar?: string;
    rating?: number;
    county?: string;
  };
  vehicles?: Array<{
    make?: string;
    model?: string;
    year?: number;
    universal?: boolean;
  }>;
  distanceKm?: number;
  variant?: "compact" | "detailed";
  className?: string;
  viewCount?: number;
};

function formatPrice(price: string | number): string {
  const num = typeof price === "number" ? price : parseFloat(String(price).replace(/[^\d.]/g, ""));
  return isNaN(num) ? String(price) : `£${num.toFixed(2)}`;
}

function isNew(dateString?: string): boolean {
  if (!dateString) return false;
  const created = new Date(dateString).getTime();
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  return now - created < 7 * dayInMs;
}

function getVehicleText(listing: ListingCardProps): string | null {
  // Check vehicles array first (multi-vehicle support)
  if (listing.vehicles && listing.vehicles.length > 0) {
    const firstVehicle = listing.vehicles[0];
    if (firstVehicle.universal) return "Universal Fit";
    
    const parts = [];
    if (firstVehicle.year) parts.push(firstVehicle.year);
    if (firstVehicle.make) parts.push(firstVehicle.make);
    if (firstVehicle.model) parts.push(firstVehicle.model);
    
    if (parts.length > 0) {
      const suffix = listing.vehicles.length > 1 ? ` +${listing.vehicles.length - 1} more` : "";
      return parts.join(" ") + suffix;
    }
  }
  
  // Fallback to old single vehicle fields
  const parts = [];
  if (listing.year) parts.push(listing.year);
  if (listing.make) parts.push(listing.make);
  if (listing.model) parts.push(listing.model);
  
  return parts.length > 0 ? parts.join(" ") : null;
}

export default function ListingCard(props: ListingCardProps) {
  const {
    id,
    title,
    price,
    image,
    category,
    condition,
    oem,
    status,
    createdAt,
    previousPrice,
    seller,
    distanceKm,
    variant = "compact",
    className = "",
  } = props;

  const priceNum = typeof price === "number" ? price : parseFloat(String(price).replace(/[^\d.]/g, ""));
  const hasPriceDrop = previousPrice && previousPrice > priceNum;
  const priceDrop = hasPriceDrop ? ((previousPrice - priceNum) / previousPrice) * 100 : 0;
  const vehicleText = getVehicleText(props);
  const isUnder20 = Number.isFinite(priceNum) && priceNum > 0 && priceNum <= 20;
  const isNewToday = createdAt ? Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000 : false;
  const isPopularSeller = typeof seller?.rating === "number" && seller.rating >= 4.8;
  const viewCount = typeof props.viewCount === "number" ? props.viewCount : undefined;
  const utilityBadges = [
    isUnder20 ? "Under £20" : null,
    isNewToday ? "New today" : null,
    isPopularSeller ? "Popular seller" : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`group relative ${className}`}>
      <Link
        href={`/listing/${id}`}
        data-listing-card={String(id)}
        className="block border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-200"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          <SafeImage
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />

          {/* Badges overlay - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {status === "active" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-semibold rounded-full shadow">
                <CheckCircle2 className="h-3 w-3" />
                Available
              </span>
            )}
            {isNew(createdAt) && (
              <span className="inline-block px-2 py-0.5 bg-blue-500 text-white text-[10px] font-semibold rounded-full shadow">
                NEW
              </span>
            )}
            {hasPriceDrop && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full shadow">
                <TrendingDown className="h-3 w-3" />
                {priceDrop.toFixed(0)}% OFF
              </span>
            )}
          </div>

          {/* Category badge - Top Right */}
          {category && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-0.5 bg-black/70 text-white text-[10px] font-semibold rounded-full shadow backdrop-blur-sm">
                {category}
              </span>
            </div>
          )}

          {/* Favorite button overlay - Bottom Right */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div onClick={(e) => e.preventDefault()}>
              <FavoriteButton listingId={String(id)} showLabel={false} className="shadow-md" />
            </div>
          </div>
          {/* Engagement */}
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-[10px] font-semibold px-2 py-1 backdrop-blur-sm">
            <Eye className="h-3.5 w-3.5" />
            <span>{typeof viewCount === "number" ? viewCount : "—"}</span>
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <Heart className="h-3 w-3 text-white/80" />
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-2">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
            {title}
          </h3>

          {/* Vehicle Compatibility */}
          {vehicleText && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
              <Package className="h-3 w-3" />
              <span className="font-medium">{vehicleText}</span>
            </div>
          )}

          {/* Condition & OEM */}
          <div className="mt-1 flex items-center gap-2 text-xs">
            {condition && (
              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                {condition}
              </span>
            )}
            {oem && (
              <span className="text-gray-500 font-mono truncate">OEM: {oem}</span>
            )}
          </div>

          {/* Badges + Price */}
          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {utilityBadges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
                  {badge}
                </span>
              ))}
            </div>
            <div className="text-right">
              <span className="block text-lg font-bold text-gray-900 leading-none">
                {formatPrice(price)}
              </span>
              {hasPriceDrop && previousPrice && (
                <span className="text-[11px] text-gray-500 line-through">
                  £{previousPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Seller Info */}
          {seller && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-gray-600 truncate">{seller.name || "Seller"}</span>
                {typeof seller.rating === "number" && (
                  <div className="flex items-center gap-0.5 text-yellow-500 flex-shrink-0">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-gray-900 font-semibold">{seller.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {(seller.county || typeof distanceKm === "number") && (
                <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {typeof distanceKm === "number" 
                      ? `${distanceKm.toFixed(0)}km` 
                      : seller.county}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
