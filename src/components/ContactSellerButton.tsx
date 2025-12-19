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
  className?: string;
};

export default function ContactSellerButton({
  sellerName,
  sellerId,
  listingId,
  listingTitle,
  className = "",
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
        // Error already shown by createThread function
        return;
      }

      // Navigate to the thread
      router.push(`/messages/${encodeURIComponent(thread.id)}`);
    } catch (error) {
      console.error("Error in ContactSellerButton:", error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : "Please try again"}`);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isOwn}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition border border-transparent ${
        isOwn
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gray-900 text-white hover:bg-black"
      } ${className}`}
      title={isOwn ? "You can't message yourself" : "Contact seller"}
    >
      <MessageCircle size={18} />
      Contact seller
    </button>
  );
}
