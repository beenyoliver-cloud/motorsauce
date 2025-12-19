// src/components/category/SellerSpotlight.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Award, Package } from "lucide-react";

type Seller = {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  listingsCount: number;
};

type Props = {
  category: "oem" | "aftermarket" | "tools" | "OEM" | "Aftermarket" | "Tools";
};

export default function SellerSpotlight({ category }: Props) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedCategory = category.toLowerCase();

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const res = await fetch(`/api/categories/stats?category=${normalizedCategory}`);
        if (res.ok) {
          const data = await res.json();
          setSellers(data.topSellers || []);
        }
      } catch (err) {
        console.error("Failed to fetch top sellers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [normalizedCategory]);

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4">Top sellers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (sellers.length === 0) return null;

  const categoryLabel = category === "oem" ? "OEM" : category === "aftermarket" ? "Aftermarket" : "Tools";

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-yellow-600" />
        <h2 className="text-xl md:text-2xl font-bold text-black">Top {categoryLabel} sellers</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sellers.map((seller) => (
          <Link
            key={seller.id}
            href={`/profile/${encodeURIComponent(seller.name)}`}
            className="group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md hover:border-yellow-300 transition-all"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="h-14 w-14 rounded-full overflow-hidden bg-yellow-100 flex items-center justify-center ring-2 ring-yellow-400 ring-offset-2">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-yellow-700">
                    {seller.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Top seller badge */}
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                <Star className="h-3 w-3 text-white fill-white" />
              </div>
            </div>
            
            {/* Name */}
            <div className="mt-3 text-sm font-semibold text-gray-900 group-hover:text-yellow-700 truncate max-w-full">
              {seller.name}
            </div>
            
            {/* Stats */}
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {seller.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-0.5">
                <Package className="h-3 w-3" />
                {seller.listingsCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
