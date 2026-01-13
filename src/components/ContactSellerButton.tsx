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
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  
  // Disable if viewing own listing
  const isOwn = me?.id === sellerId || me?.name === sellerName;

  async function handleClick() {
    if (!me) {
      router.push(`/auth/login?next=/listing/${encodeURIComponent(String(listingId))}`);
      return;
    }

    if (!sellerId || !uuidRegex.test(sellerId)) {
      console.error("ContactSellerButton: Invalid or missing sellerId", sellerId);
      alert("Unable to contact seller - seller account could not be identified.");
      return;
    }

    try {
      const result = await createThread(sellerId, String(listingId));
      const conversationId = result?.thread?.id || result?.threadId;
      
      if (conversationId) {
        console.log("[ContactSeller] Navigating to conversation", { conversationId, isNew: result?.isNew });
        router.push(`/messages?selected=${conversationId}`);
      } else {
        throw new Error("Failed to get conversation ID");
      }
    } catch (err) {
      console.error("[ContactSeller] Failed to start conversation:", err);
      alert(err instanceof Error ? err.message : "Unable to start conversation. Please try again.");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isOwn}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition border border-transparent ${
        isOwn
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-yellow-500 text-black hover:bg-yellow-600"
      } ${className}`}
      title={isOwn ? "You can't message yourself" : "Contact seller"}
    >
      <MessageCircle size={18} />
      Contact seller
    </button>
  );
}
