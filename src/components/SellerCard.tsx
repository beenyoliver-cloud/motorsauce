"use client";

import Link from "next/link";
import { User, MapPin, Star, MessageCircle, Package } from "lucide-react";
import SafeImage from "./SafeImage";

type SellerCardProps = {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  listingsCount?: number;
  location?: string;
  bio?: string;
};

export default function SellerCard({
  id,
  name,
  avatar,
  rating = 5,
  reviewCount = 0,
  listingsCount = 0,
  location,
  bio,
}: SellerCardProps) {
  const profileUrl = `/profile/${encodeURIComponent(name)}`;

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Link href={profileUrl} className="flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
          {avatar ? (
            <SafeImage
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-yellow-100 flex items-center justify-center">
              <User size={32} className="text-yellow-700" />
            </div>
          )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={profileUrl} className="group">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600 transition truncate">
              {name}
            </h3>
          </Link>

          {/* Rating & Stats */}
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-gray-900">{rating.toFixed(1)}</span>
              {reviewCount > 0 && <span className="text-gray-500">({reviewCount})</span>}
            </div>
            {listingsCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <Package size={14} />
                  <span>{listingsCount} listings</span>
                </div>
              </>
            )}
            {location && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>{location}</span>
                </div>
              </>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <p className="mt-2 text-sm text-gray-700 line-clamp-2">
              {bio}
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={profileUrl}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
            >
              View profile
            </Link>
            <Link
              href={`/search?seller=${encodeURIComponent(name)}`}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
            >
              View parts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
