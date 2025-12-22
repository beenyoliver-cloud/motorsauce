"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { createOffer, createThread } from "@/lib/messagesClient";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    price: number;
    images?: { url: string }[];
  };
  sellerId: string;
  onOfferCreated?: (result?: { threadId?: string; offerId?: string }) => void;
}

export default function MakeOfferModal({
  isOpen,
  onClose,
  listing,
  sellerId,
  onOfferCreated,
}: MakeOfferModalProps) {
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Please log in to make an offer");
        return;
      }

      const amount = parseFloat(offerAmount);
      if (!amount || amount <= 0) {
        setError("Please enter a valid offer amount");
        return;
      }

      const listingImage = listing.images?.[0]?.url || undefined;

      const thread = await createThread(sellerId, listing.id);
      if (!thread) {
        throw new Error("Couldn't start chat thread with seller");
      }

      const offer = await createOffer({
        threadId: thread.id,
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage,
        recipientId: sellerId,
        amountCents: Math.round(amount * 100),
        currency: "GBP",
      });

      if (!offer) {
        throw new Error("Failed to create offer");
      }

      setOfferAmount("");
      setNotes("");
      onClose();
      onOfferCreated?.({ threadId: thread.id, offerId: offer.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const discount = listing.price > 0 
    ? (((listing.price - parseFloat(offerAmount || "0")) / listing.price) * 100).toFixed(1)
    : "0";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Make an Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Listing Info */}
          <div className="pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">Listing</p>
            <p className="font-semibold text-gray-900 line-clamp-2">{listing.title}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Asking Price:</span>
              <span className="text-sm font-semibold text-gray-900">£{listing.price.toFixed(2)}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Offer Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Offer (£)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter your offer amount"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
              />
              {offerAmount && (
                <p className="mt-2 text-sm text-gray-600">
                  {discount !== "0" && parseFloat(discount) > 0
                    ? `${discount}% below asking price`
                    : `${discount === "0" ? "Same as asking" : Math.abs(parseFloat(discount)).toFixed(1) + "% above asking"}`}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note with your offer..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !offerAmount}
                className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
