"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Search } from "lucide-react";

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

export default function BusinessCatalogue({ businessId, isOwner }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch(`/api/listings?seller_id=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          setListings(data);
        }
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [businessId]);

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
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search catalogue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
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
          {filteredListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listing/${listing.id}`}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{listing.title}</h3>
                <p className="text-lg font-bold text-gray-900">£{listing.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
