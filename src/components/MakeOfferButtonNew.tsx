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
};

export default function MakeOfferButtonNew({
  sellerName,
  sellerId,
  listingId,
  listingTitle,
  listingImage,
  listingPrice = 0,
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
        className="rounded-md px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
          isOwnListing
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-yellow-500 text-black hover:bg-yellow-600"
        }`}
        disabled={isOwnListing}
        title={
          isOwnListing
            ? "You can't make an offer on your own listing"
            : "Make an offer on this listing"
        }
      >
        {isOwnListing ? "Your Listing" : "Make an Offer"}
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
