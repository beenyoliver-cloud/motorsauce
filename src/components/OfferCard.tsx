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
        return "bg-green-50 border-green-400 text-green-900";
      case "declined":
      case "rejected":
      case "withdrawn":
        return "bg-red-50 border-red-400 text-red-900";
      case "countered":
        return "bg-blue-50 border-blue-400 text-blue-900";
      case "pending":
      default:
        return "bg-yellow-50 border-yellow-400 text-yellow-900";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "accepted":
        return <Check size={16} className="text-green-600" />;
      case "declined":
      case "rejected":
      case "withdrawn":
        return <X size={16} className="text-red-600" />;
      case "countered":
      case "pending":
      default:
        return <TrendingUp size={16} className="text-yellow-600" />;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getStatusColor()}`}>
      {/* Listing info if available */}
      {(listingTitle || listingImage) && listingId && (
        <Link 
          href={`/listing/${listingId}`}
          className="flex items-center gap-3 mb-3 pb-3 border-b border-current border-opacity-20 hover:bg-white hover:bg-opacity-30 transition-colors rounded-lg -m-2 p-2"
        >
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle || "Listing"}
              className="w-16 h-16 object-cover rounded border-2 border-current border-opacity-30"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-75 mb-0.5">About listing:</p>
            <p className="text-sm font-semibold truncate mb-1">{listingTitle}</p>
            {listingPrice && (
              <div className="flex items-center gap-2 text-xs">
                <span className="line-through opacity-60">£{(listingPrice / 100).toFixed(2)}</span>
                <span className="font-bold text-sm">£{displayAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs font-medium opacity-75">
              <span>View listing</span>
              <ExternalLink size={12} />
            </div>
          </div>
        </Link>
      )}
      {(listingTitle || listingImage) && !listingId && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-current border-opacity-20">
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle || "Listing"}
              className="w-16 h-16 object-cover rounded border-2 border-current border-opacity-30"
            />
          )}
          {listingTitle && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium opacity-75 mb-0.5">About listing:</p>
              <p className="text-sm font-semibold truncate">{listingTitle}</p>
            </div>
          )}
        </div>
      )}

      {/* Offer amount and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={20} />
          <div>
            <p className="text-xs font-medium opacity-75">Offer Amount</p>
            <p className="text-2xl font-bold">
              {currency === "GBP" ? "£" : currency} {displayAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white bg-opacity-50 border border-current border-opacity-30">
          {getStatusIcon()}
          <span className="text-xs font-bold uppercase tracking-wide">{status}</span>
        </div>
      </div>

      {/* Action buttons for seller */}
      {canRespond && !showCounter && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Check size={18} />
            Accept
          </button>
          <button
            onClick={() => setShowCounter(true)}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <TrendingUp size={18} />
            Counter
          </button>
          <button
            onClick={handleDecline}
            disabled={updating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Counter offer form */}
      {canRespond && showCounter && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">£</span>
            <input
              type="text"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="Enter counter offer"
              className="flex-1 px-3 py-2 border-2 border-current border-opacity-30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updating}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCounter}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send Counter
            </button>
            <button
              onClick={() => {
                setShowCounter(false);
                setCounterAmount("");
              }}
              disabled={updating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status message for non-interactive states */}
      {!canRespond && status === "accepted" && (
        <div className="text-sm font-medium text-center py-2">
          ✓ Offer accepted! Arrange payment and delivery details.
        </div>
      )}
      {!canRespond && (status === "declined" || status === "rejected") && (
        <div className="text-sm font-medium text-center py-2">
          This offer was declined.
        </div>
      )}
      {!canRespond && !isCurrentUserSeller && isPending && (
        <div className="text-sm font-medium text-center py-2">
          Waiting for seller to respond...
        </div>
      )}
    </div>
  );
}
