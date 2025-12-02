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
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-black">Make an offer</h3>
              <p className="text-xs text-gray-600 mt-0.5">Send a private offer to {sellerName}</p>
            </div>

            {/* Listing preview */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <a
                href={`/listing/${encodeURIComponent(String(listingId))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
              >
                {listingImage && (
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={listingImage}
                      alt={listingTitle}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-black group-hover:underline">
                    {listingTitle}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View listing
                  </p>
                </div>
              </a>
            </div>

            {/* Offer form */}
            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-gray-900">Your offer</label>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">£</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">The seller will be notified and can accept, decline, or counter your offer</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 bg-gray-50">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {submitting && <span className="h-2 w-2 rounded-full bg-black/40 animate-pulse" />}
                {submitting ? "Sending offer…" : "Send offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
