// src/components/MySoldTab.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUserSync } from "@/lib/auth";
import SafeImage from "@/components/SafeImage";
import { CheckCircle2, RotateCcw } from "lucide-react";

type SoldListing = {
  id: string | number;
  title: string;
  price: string;
  image?: string;
  images?: string[];
  markedSoldAt?: string;
};

export default function MySoldTab({ sellerName }: { sellerName: string }) {
  const [sold, setSold] = useState<SoldListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSold();
  }, [sellerName]);

  async function loadSold() {
    try {
      const user = getCurrentUserSync();
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch sold listings
      const { supabaseBrowser } = await import("@/lib/supabase");
      const supabase = supabaseBrowser();
      
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .eq("status", "sold")
        .order("marked_sold_at", { ascending: false });

      if (error) {
        console.error("Error loading sold listings:", error);
        return;
      }

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || "Untitled",
        price: item.price ? `£${Number(item.price).toFixed(2)}` : "£0.00",
        image: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : item.image_url || "/images/placeholder.jpg",
        images: Array.isArray(item.images) ? item.images : [],
        markedSoldAt: item.marked_sold_at,
      }));

      setSold(formatted);
    } catch (error) {
      console.error("Error in loadSold:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading sold listings...
      </div>
    );
  }

  if (sold.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No sold listings yet</p>
        <p className="text-sm text-gray-400">
          Listings you mark as sold will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {sold.map((item) => (
        <div
          key={item.id}
          className="relative border border-gray-200 rounded-xl overflow-hidden bg-white opacity-75"
        >
          <Link href={`/listing/${item.id}`} className="block">
            {/* SOLD Badge Overlay */}
            <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
              <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-xl transform -rotate-12">
                SOLD
              </div>
            </div>

            {/* Image */}
            <div className="aspect-[4/3] bg-gray-100 relative">
              <SafeImage
                src={item.image || "/images/placeholder.jpg"}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                {item.title}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">{item.price}</span>
                {item.markedSoldAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(item.markedSoldAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
