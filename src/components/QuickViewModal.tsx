"use client";

import { useState, useEffect } from "react";
import { X, Eye, MessageCircle, Heart } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import TrustBadge from "@/components/TrustBadge";
import Link from "next/link";

type Listing = {
  id: string;
  title: string;
  price: string;
  image: string;
  images?: string[];
  category: string;
  condition: string;
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  description?: string;
  seller: {
    name: string;
    avatar: string;
    rating?: number;
  };
};

interface QuickViewModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ listingId, isOpen, onClose }: QuickViewModalProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !listingId) return;

    setLoading(true);
    fetch(`/api/listings?id=${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setListing(data[0]);
        } else if (data && !Array.isArray(data)) {
          setListing(data);
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const images = listing?.images || (listing?.image ? [listing.image] : []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all hover:scale-110"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5 text-gray-900" />
        </button>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading...</span>
            </div>
          </div>
        ) : !listing ? (
          <div className="p-12 text-center text-gray-600">
            <p>Listing not found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-h-[90vh] overflow-y-auto">
            {/* Left: Image Gallery */}
            <div className="p-6 bg-gray-50">
              <div className="sticky top-6">
                <div className="relative aspect-[4/3] bg-white rounded-xl overflow-hidden border border-gray-200">
                  <SafeImage
                    src={images[currentImageIndex] || listing.image}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-3 left-3 text-xs px-3 py-1 rounded-full font-semibold ${
                      listing.category === "OEM"
                        ? "bg-yellow-500 text-black"
                        : listing.category === "Aftermarket"
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {listing.category}
                  </span>
                </div>

                {/* Thumbnail navigation */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex
                            ? "border-yellow-500 ring-2 ring-yellow-300"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="p-6 space-y-4">
              {/* Title & Price */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h2>
                <div className="text-3xl font-extrabold text-gray-900">{listing.price}</div>
              </div>

              {/* Vehicle Info */}
              {listing.category !== "Tool" && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {listing.make && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {listing.make}
                    </span>
                  )}
                  {listing.model && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {listing.model}
                    </span>
                  )}
                  {listing.genCode && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {listing.genCode}
                    </span>
                  )}
                  {listing.engine && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {listing.engine}
                    </span>
                  )}
                  {(listing.year || listing.yearFrom || listing.yearTo) && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {listing.year || `${listing.yearFrom || ""}${listing.yearFrom || listing.yearTo ? "–" : ""}${listing.yearTo || ""}`}
                    </span>
                  )}
                </div>
              )}

              {/* Condition */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Condition:</span>
                <span className="text-sm font-semibold text-gray-900">{listing.condition}</span>
              </div>

              {/* Description */}
              {listing.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 line-clamp-4">{listing.description}</p>
                </div>
              )}

              {/* Seller Info */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <SafeImage
                    src={listing.seller.avatar}
                    alt={listing.seller.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{listing.seller.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <TrustBadge soldCount={undefined} />
                      {listing.seller.rating && (
                        <span>⭐ {listing.seller.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  Message Seller
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Link
                  href={`/listing/${listing.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-yellow-500 hover:text-black transition-all duration-300"
                >
                  <Eye className="h-4 w-4" />
                  View Full Details
                </Link>
                <button 
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all duration-300"
                  aria-label="Add to favorites"
                >
                  <Heart className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
