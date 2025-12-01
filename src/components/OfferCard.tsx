"use client";

import { useState } from "react";
import { TrendingUp, Check, X, DollarSign } from "lucide-react";
import { updateOfferStatus } from "@/lib/messagesClient";

type OfferCardProps = {
  offerId: string;
  amount: number;
  currency: string;
  status: string;
  listingTitle?: string;
  listingImage?: string;
  isCurrentUserSeller: boolean;
  onUpdate?: () => void;
};

export default function OfferCard({
  offerId,
  amount,
  currency,
  status,
  listingTitle,
  listingImage,
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
    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "accepted");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to accept offer:", err);
      alert("Failed to accept offer");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "declined");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to decline offer:", err);
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

    setUpdating(true);
    try {
      await updateOfferStatus(offerId, "countered", Math.round(pounds * 100));
      setShowCounter(false);
      setCounterAmount("");
      onUpdate?.();
    } catch (err) {
      console.error("Failed to counter offer:", err);
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
      {(listingTitle || listingImage) && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-current border-opacity-20">
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle || "Listing"}
              className="w-12 h-12 object-cover rounded border-2 border-current border-opacity-30"
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
