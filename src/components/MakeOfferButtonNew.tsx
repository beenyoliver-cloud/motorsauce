// src/components/MakeOfferButtonNew.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MakeOfferModal from "./MakeOfferModal";
import { supabaseBrowser } from "@/lib/supabase";

type MakeOfferButtonNewProps = {
  sellerName: string;
  sellerId: string;
  listingId: string | number;
  listingTitle: string;
  listingImage?: string;
  listingPrice?: number;
  className?: string;
};

export default function MakeOfferButtonNew({
  sellerName,
  sellerId,
  listingId,
  listingTitle,
  listingImage,
  listingPrice = 0,
  className = "",
}: MakeOfferButtonNewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkIsOwnListing();
  }, []);

  async function checkIsOwnListing() {
    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id === sellerId) {
        setIsOwnListing(true);
      }
    } catch (error) {
      console.error("Error checking if own listing:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClick() {
    setIsModalOpen(true);
  }

  function handleOfferCreated() {
    // Redirect to offers page after successful creation
    router.push("/offers-standalone");
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={`rounded-md px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-500 cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
          isOwnListing
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : "bg-white text-gray-900 border-yellow-500 hover:bg-yellow-50"
        } ${className}`}
        disabled={isOwnListing}
        title={
          isOwnListing
            ? "You can't make an offer on your own listing"
            : "Make an offer on this listing"
        }
      >
        {isOwnListing ? "Your Listing" : "Make an offer"}
      </button>

      <MakeOfferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listing={{
          id: String(listingId),
          title: listingTitle,
          price: listingPrice,
          images: listingImage ? [{ url: listingImage }] : undefined,
        }}
        sellerId={sellerId}
        onOfferCreated={handleOfferCreated}
      />
    </>
  );
}
