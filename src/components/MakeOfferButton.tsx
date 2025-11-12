// src/components/MakeOfferButton.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserSync } from "@/lib/auth";
import { createOffer } from "@/lib/offersStore";
import {
  slugify,
  upsertThreadForPeer,
  appendMessage,
  appendOfferMessage,
  nowClock,
} from "@/lib/chatStore";
import { displayName } from "@/lib/names";

type MakeOfferButtonProps = {
  sellerName: string;          // e.g. "OliverB"
  sellerEmail?: string;        // STABLE peerId (optional) e.g. "beenyoliver@gmail.com"
  listingId: string | number;
  listingTitle: string;
  listingImage?: string;
};

export default function MakeOfferButton({
  sellerName,
  sellerEmail,          // ← required: we pass this as peerId
  listingId,
  listingTitle,
  listingImage,
}: MakeOfferButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");

  const me = getCurrentUserSync();
  const buyerName = me?.name?.trim() || "You";
  const buyerId = String(me?.email || me?.id || me?.name || ""); // use my email first for stability

  const isOwn = buyerName.toLowerCase() === sellerName.trim().toLowerCase();

  // Thread id is name-based (fine) — peer mirroring uses sellerEmail
  const threadId = useMemo(
    () => `t_${slugify(buyerName)}_${slugify(sellerName)}_${String(listingId)}`,
    [buyerName, sellerName, listingId]
  );

  function submit() {
    if (isOwn) return;

    const pounds = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) return;

    // 1) Ensure the thread exists and bind the seller's *email* as peerId
      upsertThreadForPeer(buyerName, sellerName, {
        preferThreadId: threadId,
        initialLast: `Offer: £${pounds.toFixed(2)}`,
        peerId: sellerEmail || sellerName, // fallback to name if no stable id available
      });

    // 2) System line
    appendMessage(threadId, {
      id: `sys_${Date.now()}`,
      from: "system",
      ts: nowClock(),
      type: "system",
      text: `${displayName(buyerName)} started an offer.`,
    });

    // 3) Create offer in offersStore for buyer-side toast/history
    const newOffer = createOffer({
      threadId,
      from: "You",
      amountCents: Math.round(pounds * 100),
      currency: "GBP",
      listingId,
      listingTitle,
      listingImage,
      peerName: sellerName,
    });

    // 4) Append the offer *message* immediately so it mirrors to seller
    appendOfferMessage(threadId, {
      id: newOffer.id,
      amountCents: newOffer.amountCents,
      currency: newOffer.currency ?? "GBP",
      status: "pending",
      starter: buyerName,
      starterId: buyerId,
      recipient: sellerName,
  recipientId: sellerEmail || sellerName, // ← make the recipient the seller's email (fallback to name)
      buyerId,
  sellerId: sellerEmail || sellerName,
      listingId,
      listingTitle,
      listingImage,
      peerName: sellerName,
      peerId: sellerEmail,
    });

    router.push(`/messages/${encodeURIComponent(threadId)}?offer=1`);
  }

  return (
    <>
      <button
        onClick={() => !isOwn && setOpen(true)}
        className={`rounded-md px-4 py-2 text-sm font-semibold ${
          isOwn
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-black"
        }`}
        aria-disabled={isOwn}
        title={isOwn ? "You can’t make an offer on your own listing" : "Make an offer"}
      >
        Make an offer
      </button>

      {open && !isOwn && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-black">Make an offer</h3>
            <p className="mt-1 text-sm text-gray-700 line-clamp-2">{listingTitle}</p>

            <label className="mt-4 block text-sm text-gray-900">Amount (£)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 75"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-600"
              >
                Send offer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
