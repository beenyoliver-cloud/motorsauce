"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Check, X, DollarSign, ExternalLink } from "lucide-react";
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
  const [showCounter, setShowCounter] = useState(false);

  const displayAmount = amount / 100;
  const isPending = status === "pending" || status === "countered";
  const canRespond = isCurrentUserSeller && isPending;

  async function handleAccept() {
    console.log(`[OfferCard] Accepting offer ${offerId}`);
    setUpdating(true);
    try {
      const result = await updateOfferStatus(offerId, "accepted");
      console.log(`[OfferCard] Offer accepted, result:`, result);
      onUpdate?.();
      console.log(`[OfferCard] onUpdate callback called, UI should refresh`);
    } catch (err) {
      console.error("[OfferCard] Failed to accept offer:", err);
      alert("Failed to accept offer");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    console.log(`[OfferCard] Declining offer ${offerId}`);
    setUpdating(true);
    try {
      const result = await updateOfferStatus(offerId, "declined");
      console.log(`[OfferCard] Offer declined, result:`, result);
      onUpdate?.();
      console.log(`[OfferCard] onUpdate callback called, UI should refresh`);
    } catch (err) {
      console.error("[OfferCard] Failed to decline offer:", err);
      alert("Failed to decline offer");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCounter() {
    const pounds = parseFloat(counterAmount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) {
      alert("Please enter a valid counter offer amount");
      return;
    }

    console.log(`[OfferCard] Countering offer ${offerId} with £${pounds}`);
    setUpdating(true);
    try {
      const result = await updateOfferStatus(offerId, "countered", Math.round(pounds * 100));
      console.log(`[OfferCard] Offer countered, result:`, result);
      setShowCounter(false);
      setCounterAmount("");
      onUpdate?.();
      console.log(`[OfferCard] onUpdate callback called, UI should refresh`);
    } catch (err) {
      console.error("[OfferCard] Failed to counter offer:", err);
      alert("Failed to send counter offer");
    } finally {
      setUpdating(false);
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "accepted":
        return "bg-[#050608] border-green-500 text-white";
      case "declined":
      case "rejected":
      case "withdrawn":
        return "bg-[#050608] border-red-500 text-white";
      case "countered":
        return "bg-[#050608] border-blue-500 text-white";
      case "pending":
      default:
        return "bg-[#050608] border-[#D4AF37] text-white";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "accepted":
        return <Check size={16} className="text-green-500" />;
      case "declined":
      case "rejected":
      case "withdrawn":
        return <X size={16} className="text-red-500" />;
      case "countered":
      case "pending":
      default:
        return <TrendingUp size={16} className="text-[#D4AF37]" />;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getStatusColor()}`}>
      {/* Listing info if available */}
      {(listingTitle || listingImage) && listingId && (
        <Link 
          href={`/listing/${listingId}`}
          className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10 hover:bg-white/5 transition-colors rounded-lg -m-2 p-2"
        >
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle || "Listing"}
              className="w-16 h-16 object-cover rounded border-2 border-[#D4AF37]/30"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 mb-0.5">About listing:</p>
            <p className="text-sm font-semibold truncate mb-1 text-white">{listingTitle}</p>
            {listingPrice && (
              <div className="flex items-center gap-2 text-xs">
                <span className="line-through text-gray-500">£{(listingPrice / 100).toFixed(2)}</span>
                <span className="font-bold text-sm text-[#D4AF37]">£{displayAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs font-medium text-[#D4AF37]">
              <span>View listing</span>
              <ExternalLink size={12} />
            </div>
          </div>
        </Link>
      )}
      {(listingTitle || listingImage) && !listingId && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle || "Listing"}
              className="w-16 h-16 object-cover rounded border-2 border-[#D4AF37]/30"
            />
          )}
          {listingTitle && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 mb-0.5">About listing:</p>
              <p className="text-sm font-semibold truncate text-white">{listingTitle}</p>
            </div>
          )}
        </div>
      )}

      {/* Offer amount and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-[#D4AF37]" />
          <div>
            <p className="text-xs font-medium text-gray-400">Offer Amount</p>
            <p className="text-2xl font-bold text-white">
              {currency === "GBP" ? "£" : currency} {displayAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/30">
          {getStatusIcon()}
          <span className="text-xs font-bold uppercase tracking-wide text-[#D4AF37]">{status}</span>
        </div>
      </div>

      {/* Action buttons for seller */}
      {canRespond && !showCounter && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={18} />
            Accept
          </button>
          <button
            onClick={() => setShowCounter(true)}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-[#050608] rounded-lg font-semibold hover:bg-[#E5BF47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TrendingUp size={18} />
            Counter
          </button>
          <button
            onClick={handleDecline}
            disabled={updating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Counter offer form */}
      {canRespond && showCounter && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#D4AF37]">£</span>
            <input
              type="text"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="Enter counter offer"
              className="flex-1 px-3 py-2 border-2 border-[#D4AF37]/30 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              disabled={updating}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCounter}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-[#D4AF37] text-[#050608] rounded-lg font-semibold hover:bg-[#E5BF47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Counter
            </button>
            <button
              onClick={() => {
                setShowCounter(false);
                setCounterAmount("");
              }}
              disabled={updating}
              className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status message for non-interactive states */}
      {!canRespond && status === "accepted" && (
        <div className="text-sm font-medium text-center py-2 text-green-400">
          ✓ Offer accepted! Arrange payment and delivery details.
        </div>
      )}
      {!canRespond && (status === "declined" || status === "rejected") && (
        <div className="text-sm font-medium text-center py-2 text-red-400">
          This offer was declined.
        </div>
      )}
      {!canRespond && !isCurrentUserSeller && isPending && (
        <div className="text-sm font-medium text-center py-2 text-gray-400">
          Waiting for seller to respond...
        </div>
      )}
    </div>
  );
}
