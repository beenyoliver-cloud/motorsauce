"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getCurrentUserSync } from "@/lib/auth";
import { upsertThreadForPeer } from "@/lib/chatStore";
import { displayName } from "@/lib/names";

type ContactSellerButtonProps = {
  sellerName: string;
  listingId: string | number;
  listingTitle?: string;
};

export default function ContactSellerButton({
  sellerName,
  listingId,
  listingTitle,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const me = getCurrentUserSync();
  const myName = me?.name?.trim() || "You";
  
  // Disable if viewing own listing
  const isOwn = me?.name === sellerName;

  function handleClick() {
    if (!me) {
      router.push(`/auth/login?next=/listing/${encodeURIComponent(String(listingId))}`);
      return;
    }

    // Create or find thread with this seller
    const thread = upsertThreadForPeer(
      myName,
      sellerName,
      {
        listingRef: String(listingId),
        initialLast: listingTitle ? `About: ${listingTitle}` : "New message",
      }
    );

    // Navigate to the thread
    router.push(`/messages/${encodeURIComponent(thread.id)}`);
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
