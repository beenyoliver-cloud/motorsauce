// src/components/MakeOfferButtonNew.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";

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
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push(`/auth/login?next=/listing/${encodeURIComponent(String(listingId))}`);
        return;
      }

      // Create offer via API
      const response = await fetch("/api/offers/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listing_id: String(listingId),
          amount_cents: Math.round(pounds * 100),
          message: `I'd like to offer £${pounds.toFixed(2)} for ${listingTitle}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create offer");
        setSubmitting(false);
        return;
      }

      // Success - close modal and show success message
      setOpen(false);
      alert(`Offer of £${pounds.toFixed(2)} sent successfully! The seller will be notified.`);
      
      // Optionally navigate to offers page
      router.push("/profile/You?tab=offers");
    } catch (error) {
      console.error("[MakeOfferButtonNew] Submit error:", error);
      alert("Failed to send offer. Please try again.");
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
                className="rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
