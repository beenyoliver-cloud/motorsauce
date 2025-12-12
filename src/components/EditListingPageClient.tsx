"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import EditListingForm from "@/components/EditListingForm";

type Listing = {
  id: string | number;
  title: string;
  price?: number | string;
  images?: string[];
  category?: string;
  part_type?: string;
  main_category?: string;
  condition?: string;
  make?: string;
  model?: string;
  year?: number;
  vehicles?: any[];
  quantity?: number;
  postcode?: string;
  shipping_option?: string;
  accepts_returns?: boolean;
  return_days?: number;
  description?: string;
  seller_id?: string;
  seller_postcode?: string;
  seller_lat?: number | null;
  seller_lng?: number | null;
  status?: string;
  seller?: { id?: string; name?: string };
};

export default function EditListingPageClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = supabaseBrowser();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not logged in, redirect to listing view
        router.push(`/listing/${listingId}`);
        return;
      }

      // Fetch listing
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*, seller:profiles!seller_id ( id, name )")
        .eq("id", listingId)
        .maybeSingle();

      if (listingError || !listingData) {
        setError("Listing not found");
        setLoading(false);
        return;
      }

      // Check ownership
      if (listingData.seller_id !== user.id) {
        // Not the owner, redirect to listing view
        router.push(`/listing/${listingId}`);
        return;
      }

      setListing(listingData);
      setLoading(false);
    }

    loadData();
  }, [listingId, router]);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
            </div>
            <p className="mt-8 text-gray-500">Loading listing...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || !listing) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Error</h1>
            <p className="text-lg text-red-600">{error || "Listing not found"}</p>
            <button
              onClick={() => router.back()}
              className="mt-6 px-6 py-3 bg-gold-500 text-black font-semibold rounded-xl hover:bg-gold-600 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Edit Your Listing</h1>
          <p className="text-lg text-gray-600">Update your listing details</p>
          <p className="text-sm text-gray-500 mt-2">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
        </div>
        <EditListingForm listing={listing} />
      </div>
    </section>
  );
}
