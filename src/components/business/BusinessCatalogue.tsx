"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Search, Star, Flame, Sparkles, UploadCloud } from "lucide-react";
import BulkUploadDialog from "./BulkUploadDialog";

type Props = {
  businessId: string;
  isOwner: boolean;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  images: string[];
  created_at: string;
};

type Promotion = {
  id: string;
  listing_id: string;
  promotion_type: string;
  promotion_text: string | null;
  discount_percentage: number | null;
};

export default function BusinessCatalogue({ businessId, isOwner }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingsRes, promotionsRes] = await Promise.all([
          fetch(`/api/listings?seller_id=${businessId}`),
          fetch(`/api/business/promotions?business_id=${businessId}`),
        ]);
        
        if (listingsRes.ok) {
          const data = await listingsRes.json();
          setListings(data);
        }
        
        if (promotionsRes.ok) {
          const promoData = await promotionsRes.json();
          setPromotions(promoData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [businessId, refreshKey]);

  const handleUploadComplete = () => {
    setUploadOpen(false);
    setRefreshKey((key) => key + 1);
  };

  function getPromotion(listingId: string) {
    return promotions.find((p) => p.listing_id === listingId);
  }

  function getPromoBadge(promoType: string) {
    switch (promoType) {
      case "featured":
        return { icon: Star, color: "bg-yellow-500", text: "Featured" };
      case "sale":
        return { icon: Flame, color: "bg-red-500", text: "Sale" };
      case "new_arrival":
        return { icon: Sparkles, color: "bg-blue-500", text: "New" };
      case "spotlight":
        return { icon: Star, color: "bg-purple-500", text: "Spotlight" };
      default:
        return null;
    }
  }

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search catalogue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        {isOwner && (
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:border-yellow-400 hover:text-yellow-600 transition"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk upload parts
          </button>
        )}
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">
            {searchTerm ? "Try a different search term" : "This business hasn't listed any items yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map((listing) => {
            const promo = getPromotion(listing.id);
            const promoBadge = promo ? getPromoBadge(promo.promotion_type) : null;
            
            return (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group relative"
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Promotion Badge */}
                  {promoBadge && promo && (
                    <div className={`absolute top-2 right-2 z-10 ${promoBadge.color} text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg`}>
                      <promoBadge.icon className="w-3 h-3" />
                      {promo.promotion_text || promoBadge.text}
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {promo?.discount_percentage && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-md text-sm font-bold shadow-lg">
                      -{promo.discount_percentage}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{listing.title}</h3>
                  <p className="text-lg font-bold text-gray-900">£{Number(listing.price).toFixed(2)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {isOwner && (
        <BulkUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={handleUploadComplete}
        />
      )}
    </div>
  );
}
