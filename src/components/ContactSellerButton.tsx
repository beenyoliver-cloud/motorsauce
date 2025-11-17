"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getCurrentUserSync } from "@/lib/auth";
import { createThread } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";

type ContactSellerButtonProps = {
  sellerName: string;
  sellerId?: string;
  listingId: string | number;
  listingTitle?: string;
};

export default function ContactSellerButton({
  sellerName,
  sellerId,
  listingId,
  listingTitle,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const me = getCurrentUserSync();
  
  // Disable if viewing own listing
  const isOwn = me?.id === sellerId || me?.name === sellerName;

  async function handleClick() {
    if (!me) {
      router.push(`/auth/login?next=/listing/${encodeURIComponent(String(listingId))}`);
      return;
    }

    if (!sellerId) {
      console.error("ContactSellerButton: No sellerId provided");
      alert("Unable to contact seller - seller information is missing");
      return;
    }

    try {
      // Create or find thread with this seller using new Supabase system
      const thread = await createThread(sellerId, String(listingId));
      
      if (!thread) {
        console.error("Failed to create thread - createThread returned null");
        alert("Unable to start conversation. Please try again or contact support.");
        return;
      }

      // Navigate to the thread
      router.push(`/messages/${encodeURIComponent(thread.id)}`);
    } catch (error) {
      console.error("Error in ContactSellerButton:", error);
      alert("Unable to start conversation. Please try again.");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isOwn}
      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-900 bg-white px-5 py-2.5 font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
      title={isOwn ? "You can't message yourself" : "Contact seller"}
    >
      <MessageCircle size={18} />
      Contact Seller
    </button>
  );
}
