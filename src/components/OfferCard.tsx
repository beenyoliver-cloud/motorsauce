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

  const offeredPrice = amount / 100;
  const originalPrice = listingPrice ? listingPrice / 100 : offeredPrice;
  const isPending = status === "pending";
  const canRespond = isCurrentUserSeller && isPending;

  async function handleAccept() {
    if (!confirm("Accept this offer? The buyer will be able to proceed to checkout.")) return;
    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "accepted");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to accept offer:", err);
      alert("Failed to accept offer. Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Decline this offer? The buyer will be notified.")) return;
    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "declined");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to decline offer:", err);
      alert("Failed to decline offer. Please try again.");
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
    if (pounds >= originalPrice) {
      alert("Counter offer must be less than the original price");
      return;
    }
    if (pounds <= offeredPrice) {
      alert("Counter offer must be higher than the buyer's offer");
      return;
    }

    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "countered", Math.round(pounds * 100));
      setShowCounterInput(false);
      setCounterAmount("");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to counter offer:", err);
      alert("Failed to send counter offer. Please try again.");
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
    <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-[#0a0a0c] to-[#050608] rounded-[32px] shadow-2xl p-8 border border-[#D4AF37]/10 relative overflow-hidden group">
      {/* Elegant gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[32px]" />
      
      {/* Content wrapper */}
      <div className="relative z-10 space-y-6">
      {/* Header */}
      <h2 className="text-center text-white text-2xl font-bold mb-6">
        {headerText}
      </h2>

      {/* Listing Image */}
      {listingImage && (
        <div className="mb-6">
          <img
            src={listingImage}
            alt={listingTitle || "Product"}
            className="w-full h-64 object-cover rounded-2xl shadow-lg ring-1 ring-[#D4AF37]/20"
          />
        </div>
      )}

      {/* Product Name */}
      {listingTitle && (
        <h3 className="text-center text-[#D4AF37] text-xl font-bold mb-6 tracking-wide">
          {listingTitle}
        </h3>
      )}

      {/* Price Comparison Row */}
      <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-[#D4AF37]/10 backdrop-blur-sm">
        {/* Original Price */}
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">Original price</p>
          <p className="text-white text-2xl font-bold">
            £{originalPrice.toFixed(2)}
          </p>
        </div>
        
        {/* Offered Price */}
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">Offered price</p>
          <p className="text-[#D4AF37] text-3xl font-bold">
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
            className="px-6 py-3 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-[#D4AF37] text-[#D4AF37] rounded-xl font-semibold hover:from-[#2a2a2a] hover:to-[#1f1f1f] hover:shadow-lg hover:shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <Check size={20} className="mx-auto mb-1" />
            Accept
          </button>
          
          <button
            onClick={() => setShowCounterInput(true)}
            disabled={updating}
            className="px-6 py-3 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-[#D4AF37] text-[#D4AF37] rounded-xl font-semibold hover:from-[#2a2a2a] hover:to-[#1f1f1f] hover:shadow-lg hover:shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <TrendingUp size={20} className="mx-auto mb-1" />
            Counter
          </button>
          
          <button
            onClick={handleDecline}
            disabled={updating}
            className="px-6 py-3 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-[#D4AF37] text-[#D4AF37] rounded-xl font-semibold hover:from-[#2a2a2a] hover:to-[#1f1f1f] hover:shadow-lg hover:shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <X size={20} className="mx-auto mb-1" />
            Decline
          </button>
        </div>
      )}

      {/* Counter Offer Input */}
      {canRespond && showCounterInput && (
        <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-[#D4AF37]/10 backdrop-blur-sm">
          <div>
            <label className="block text-gray-400 text-sm mb-3 uppercase tracking-widest font-medium">
              Your counter offer (£)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder={(offeredPrice * 1.1).toFixed(2)}
              className="w-full px-4 py-3 bg-white/5 border-2 border-[#D4AF37]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
              disabled={updating}
            />
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              Must be between £{offeredPrice.toFixed(2)} and £{originalPrice.toFixed(2)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCounter}
              disabled={updating}
              className="px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#c9a844] text-[#050608] rounded-xl font-semibold hover:from-[#E5BF47] hover:to-[#d4b547] hover:shadow-lg hover:shadow-[#D4AF37]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Send Counter
            </button>
            <button
              onClick={() => {
                setShowCounterInput(false);
                setCounterAmount("");
              }}
              disabled={updating}
              className="px-6 py-3 bg-white/5 border-2 border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Messages - Non-interactive States */}
      {!canRespond && status === "accepted" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 border-2 border-green-500/50 text-green-400 rounded-xl font-semibold shadow-lg shadow-green-500/10">
            <Check size={20} />
            {isCurrentUserSeller ? "Accepted - Waiting for payment" : "Accepted - Proceed to checkout"}
          </div>
        </div>
      )}
      
      {!canRespond && status === "declined" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/10 border-2 border-red-500/50 text-red-400 rounded-xl font-semibold shadow-lg shadow-red-500/10">
            <X size={20} />
            Offer Declined
          </div>
        </div>
      )}
      
      {!canRespond && !isCurrentUserSeller && isPending && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 text-[#D4AF37] rounded-xl font-semibold shadow-lg shadow-[#D4AF37]/10">
            Waiting for seller response...
          </div>
        </div>
      )}

      {/* View Listing Link */}
      {listingId && (
        <div className="text-center pt-4 border-t border-white/5">
          <Link 
            href={`/listing/${listingId}`}
            className="text-[#D4AF37] text-sm hover:text-[#E5BF47] hover:underline inline-flex items-center gap-1 font-medium transition-colors"
          >
            View listing details →
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
