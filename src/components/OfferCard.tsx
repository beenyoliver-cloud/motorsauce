"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, TrendingUp } from "lucide-react";
import { updateOfferStatus } from "@/lib/messagesClient";

type OfferCardProps = {
  offerId: string;
  amount: number;
  currency: string;
  status: string;
  listingId?: string;
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  isCurrentUserSeller: boolean;
  onUpdate?: () => void;
};

export default function OfferCard({
  offerId,
  amount,
  currency,
  status,
  listingId,
  listingTitle,
  listingImage,
  listingPrice,
  isCurrentUserSeller,
  onUpdate,
}: OfferCardProps) {
  const [updating, setUpdating] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [showCounterInput, setShowCounterInput] = useState(false);

  // Debug: Log what data we're receiving
  console.log("[OfferCard] Received props:", {
    offerId,
    amount,
    listingId,
    listingTitle,
    listingImage,
    listingPrice,
    status,
  });

  const offeredPrice = amount / 100;
  const originalPrice = listingPrice ? listingPrice / 100 : offeredPrice;
  console.log("[OfferCard] Price calculation:", { amount, listingPrice, offeredPrice, originalPrice });
  const isPending = status === "pending";
  const canRespond = isCurrentUserSeller && isPending;

  async function handleAccept() {
    if (!confirm("Accept this offer? The buyer will be able to proceed to checkout.")) return;
    setUpdating(true);
    try {
      console.log("[OfferCard] Calling updateOfferStatus with:", { offerId, status: "accepted" });
      const result = await updateOfferStatus(offerId, "accepted");
      console.log("[OfferCard] updateOfferStatus result:", result);
      if (!result) {
        throw new Error("Failed to update offer - no result returned");
      }
      console.log("[OfferCard] Calling onUpdate callback");
      onUpdate?.();
      console.log("[OfferCard] onUpdate callback completed");
    } catch (err) {
      console.error("[OfferCard] Failed to accept offer:", err);
      alert(`Failed to accept offer: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Decline this offer? The buyer will be notified.")) return;
    setUpdating(true);
    try {
      console.log("[OfferCard] Calling updateOfferStatus with:", { offerId, status: "declined" });
      const result = await updateOfferStatus(offerId, "declined");
      console.log("[OfferCard] updateOfferStatus result:", result);
      if (!result) {
        throw new Error("Failed to update offer - no result returned");
      }
      console.log("[OfferCard] Calling onUpdate callback");
      onUpdate?.();
      console.log("[OfferCard] onUpdate callback completed");
    } catch (err) {
      console.error("[OfferCard] Failed to decline offer:", err);
      alert(`Failed to decline offer: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUpdating(false);
    }
  }

  async function handleCounter() {
    const pounds = parseFloat(counterAmount);
    if (!pounds || pounds <= 0) {
      alert("Please enter a valid counter offer amount");
      return;
    }

    setUpdating(true);
    try {
      console.log("[OfferCard] Calling updateOfferStatus with:", { offerId, status: "countered", counterAmountCents: Math.round(pounds * 100) });
      const result = await updateOfferStatus(offerId, "countered", Math.round(pounds * 100));
      console.log("[OfferCard] updateOfferStatus result:", result);
      if (!result) {
        throw new Error("Failed to update offer - no result returned");
      }
      setShowCounterInput(false);
      setCounterAmount("");
      console.log("[OfferCard] Calling onUpdate callback");
      onUpdate?.();
      console.log("[OfferCard] onUpdate callback completed");
    } catch (err) {
      console.error("[OfferCard] Failed to counter offer:", err);
      alert(`Failed to send counter offer: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUpdating(false);
    }
  }

  // Premium dark card design - seller view or buyer view
  const headerText = isCurrentUserSeller 
    ? "You've received an offer" 
    : status === "accepted"
    ? "Offer accepted!"
    : status === "declined"
    ? "Offer declined"
    : status === "countered"
    ? "Counter offer received"
    : "Your offer";

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Professional card matching site theme */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
        {/* Content wrapper */}
        <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-gray-900 text-xl font-semibold mb-1">
          {headerText}
        </h2>
        <div className="w-12 h-0.5 bg-yellow-500 mx-auto"></div>
      </div>

      {/* Listing Image */}
      {listingImage && (
        <div className="mb-6">
          <img
            src={listingImage}
            alt={listingTitle || "Product"}
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
        </div>
      )}

      {/* Product Name */}
      {listingTitle && (
        <h3 className="text-center text-gray-800 text-lg font-medium mb-6">
          {listingTitle}
        </h3>
      )}

      {/* Price Comparison Row */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        {/* Original Price */}
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2 font-medium">Original price</p>
          <p className="text-gray-900 text-xl font-semibold">
            £{originalPrice.toFixed(2)}
          </p>
        </div>
        
        {/* Offered Price */}
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2 font-medium">Offered price</p>
          <p className="text-yellow-600 text-2xl font-bold">
            £{offeredPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Action Buttons - Seller View (Pending) */}
      {canRespond && !showCounterInput && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex flex-col items-center justify-center px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-100 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={18} className="mb-1" />
            Accept
          </button>
          
          <button
            onClick={() => setShowCounterInput(true)}
            disabled={updating}
            className="flex flex-col items-center justify-center px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg font-medium hover:bg-yellow-100 hover:border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TrendingUp size={18} className="mb-1" />
            Counter
          </button>
          
          <button
            onClick={handleDecline}
            disabled={updating}
            className="flex flex-col items-center justify-center px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X size={18} className="mb-1" />
            Decline
          </button>
        </div>
      )}

      {/* Counter Offer Input */}
      {canRespond && showCounterInput && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-gray-700 text-sm mb-3 font-medium">
              Your counter offer (£)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder={(offeredPrice * 1.1).toFixed(2)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
              disabled={updating}
            />
            <p className="text-gray-500 text-xs mt-2">
              Must be between £{offeredPrice.toFixed(2)} and £{originalPrice.toFixed(2)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCounter}
              disabled={updating}
              className="px-4 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Counter
            </button>
            <button
              onClick={() => {
                setShowCounterInput(false);
                setCounterAmount("");
              }}
              disabled={updating}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Messages - Non-interactive States */}
      {!canRespond && status === "accepted" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium">
            <Check size={18} />
            {isCurrentUserSeller ? "Accepted - Waiting for payment" : "Accepted - Proceed to checkout"}
          </div>
        </div>
      )}
      
      {!canRespond && status === "declined" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
            <X size={18} />
            Offer Declined
          </div>
        </div>
      )}
      
      {!canRespond && !isCurrentUserSeller && isPending && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg font-medium">
            Waiting for seller response...
          </div>
        </div>
      )}

      {/* View Listing Link */}
      {listingId && (
        <div className="text-center pt-4 border-t border-gray-100">
          <Link 
            href={`/listing/${listingId}`}
            className="text-yellow-600 text-sm hover:text-yellow-700 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
          >
            View listing details →
          </Link>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
