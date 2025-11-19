// src/components/MakeOfferButtonNew.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createThread, createOffer } from "@/lib/messagesClient";

type MakeOfferButtonNewProps = {
  sellerName: string;
  sellerId: string; // Required: seller's UUID for stable thread creation
  listingId: string | number;
  listingTitle: string;
  listingImage?: string;
};

export default function MakeOfferButtonNew({
  sellerName,
  sellerId,
  listingId,
  listingTitle,
  listingImage,
}: MakeOfferButtonNewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  async function handleOpen() {
    // Hydrate user
    const user = await getCurrentUser();
    if (!user) {
      router.push(`/auth/login?next=/listing/${encodeURIComponent(String(listingId))}`);
      return;
    }

    if (user.id === sellerId) {
      // Can't make offer on own listing
      return;
    }

    setCurrentUser(user);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!currentUser) return;

    const pounds = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) {
      alert("Please enter a valid offer amount");
      return;
    }

    setSubmitting(true);
    try {
      // Ensure thread exists with seller (listingRef optional: listingId)
      const thread = await createThread(sellerId, String(listingId));
      if (!thread) throw new Error("Failed to create or load conversation");

      const offer = await createOffer({
        threadId: thread.id,
        listingId: String(listingId),
        listingTitle,
        listingImage,
        recipientId: sellerId,
        amountCents: Math.round(pounds * 100),
        currency: "GBP",
      });

      if (!offer) throw new Error("Offer creation failed");

      setOpen(false);
      alert(`Offer of £${pounds.toFixed(2)} sent! Opening conversation…`);
      // Navigate to unified messages thread
      router.push(`/messages/${thread.id}`);
    } catch (err: any) {
      console.error("[MakeOfferButtonNew] Unified offer submit error", err);
      alert(err.message || "Failed to send offer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isOwn = currentUser?.id === sellerId;

  return (
    <>
      <button
        onClick={handleOpen}
        className={`rounded-md px-4 py-2 text-sm font-semibold ${
          isOwn
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-black"
        }`}
        disabled={isOwn}
        title={
          isOwn
            ? "You can't make an offer on your own listing"
            : "Make an offer"
        }
      >
        Make an offer
      </button>

      {open && !isOwn && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-black">Make an offer</h3>
            <p className="mt-1 text-sm text-gray-700 line-clamp-2">{listingTitle}</p>

            <label className="mt-4 block text-sm text-gray-900">Amount (£)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 75"
              disabled={submitting}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <span className="h-2 w-2 rounded-full bg-black/40 animate-pulse" />}
                {submitting ? "Sending…" : "Send offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
