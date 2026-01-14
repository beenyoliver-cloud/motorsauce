"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, TrendingUp, Clock, CheckCircle, XCircle, Check, X as XIcon } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { displayName } from "@/lib/names";
import { fetchOffers, updateOfferStatus, Offer } from "@/lib/messagesClient";

type OfferWithThread = Offer & {
  buyerName?: string;
  buyerAvatar?: string | null;
};

export default function OffersInbox() {
  const [offers, setOffers] = useState<OfferWithThread[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOffersWithThreads() {
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const allOffers = await fetchOffers();
        const incoming = allOffers.filter((o) => o.recipientId === user.id);

        const buyerIds = Array.from(new Set(incoming.map((o) => o.starterId).filter(Boolean)));
        let profileMap = new Map<string, { name?: string; avatar?: string | null }>();
        if (buyerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, avatar")
            .in("id", buyerIds);
          if (profiles) profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        }

        const enriched = incoming.map((o) => ({
          ...o,
          buyerName: profileMap.get(o.starterId)?.name || "Unknown",
          buyerAvatar: profileMap.get(o.starterId)?.avatar || null,
        }));

        setOffers(enriched);
      } catch (err) {
        console.error("[OffersInbox] Unexpected error:", err);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    loadOffersWithThreads();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadOffersWithThreads, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={16} className="text-yellow-600" />;
      case "accepted":
        return <CheckCircle size={16} className="text-green-600" />;
      case "declined":
      case "rejected":
        return <XCircle size={16} className="text-red-600" />;
      case "countered":
        return <TrendingUp size={16} className="text-blue-600" />;
      case "completed":
        return <Check size={16} className="text-emerald-600" />;
      case "withdrawn":
        return <XCircle size={16} className="text-gray-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "accepted":
        return "text-green-700 bg-green-50 border-green-200";
      case "declined":
      case "rejected":
        return "text-red-700 bg-red-50 border-red-200";
      case "countered":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "completed":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "withdrawn":
      case "expired":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="p-6 text-center">
        <TrendingUp size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No offers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {offers.map((offer) => {
        const isExpired = !!(offer.expires_at && new Date(offer.expires_at) < new Date());
        const displayAmount = offer.amountCents;
        const isPending = offer.status === "pending" || offer.status === "countered";
        const canRespond = isPending && !isExpired;

        return (
          <OfferInboxCard
            key={offer.id}
            offer={offer}
            displayAmount={displayAmount}
            isExpired={isExpired}
            canRespond={canRespond}
            onUpdate={loadOffersWithThreads}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        );
      })}
    </div>
  );
}

// Separate component for each offer card with its own state
function OfferInboxCard({
  offer,
  displayAmount,
  isExpired,
  canRespond,
  onUpdate,
  getStatusColor,
  getStatusIcon,
}: {
  offer: OfferWithThread;
  displayAmount: number;
  isExpired: boolean;
  canRespond: boolean;
  onUpdate: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactElement;
}) {
  const [updating, setUpdating] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  async function handleAccept() {
    setUpdating(true);
    try {
      await updateOfferStatus(offer.id, "accepted");
      onUpdate();
    } catch (err) {
      console.error("[OffersInbox] Failed to accept offer:", err);
      alert("Failed to accept offer");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    setUpdating(true);
    try {
      await updateOfferStatus(offer.id, "declined");
      onUpdate();
    } catch (err) {
      console.error("[OffersInbox] Failed to decline offer:", err);
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
      await updateOfferStatus(offer.id, "countered", Math.round(pounds * 100));
      setShowCounter(false);
      setCounterAmount("");
      onUpdate();
    } catch (err) {
      console.error("[OffersInbox] Failed to counter offer:", err);
      alert("Failed to send counter offer");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className={`p-3 rounded-lg border transition ${getStatusColor(offer.status)}`}>
      {/* Listing Preview with Image */}
      {offer.listingImage && (
        <Link 
          href={`/listing/${offer.listingId}`}
          className="flex items-center gap-3 mb-3 pb-3 border-b border-current border-opacity-20 hover:bg-white hover:bg-opacity-30 transition-colors rounded -mx-1 px-1 py-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.listingImage}
            alt={offer.listingTitle || "Listing"}
            className="w-16 h-16 object-cover rounded border border-current border-opacity-30 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-75 mb-0.5">Listing:</p>
            <p className="text-sm font-semibold truncate mb-1">{offer.listingTitle}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-base">£{(displayAmount / 100).toFixed(2)}</span>
            </div>
          </div>
        </Link>
      )}

      {/* Buyer Info */}
      <div className="flex items-start gap-3 mb-2">
        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white shrink-0 bg-gray-100">
          {offer.buyerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.buyerAvatar}
              alt={displayName(offer.buyerName || "Buyer")}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs">
              {(offer.buyerName || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {displayName(offer.buyerName || "Buyer")}
            </span>
            {getStatusIcon(offer.status)}
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium capitalize inline-block">
            {offer.status}
            {isExpired && offer.status === "pending" && " (expired)"}
          </span>
        </div>
      </div>

      {/* Action Buttons (Accept/Counter/Decline) */}
      {canRespond && !showCounter && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAccept}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Check size={16} />
            Accept
          </button>
          <button
            onClick={() => setShowCounter(true)}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <TrendingUp size={16} />
            Counter
          </button>
          <button
            onClick={handleDecline}
            disabled={updating}
            className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Counter Form */}
      {canRespond && showCounter && (
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">£</span>
            <input
              type="text"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="Enter counter offer"
              className="flex-1 px-3 py-2 border border-current border-opacity-30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={updating}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCounter}
              disabled={updating}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send Counter
            </button>
            <button
              onClick={() => {
                setShowCounter(false);
                setCounterAmount("");
              }}
              disabled={updating}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Conversation Button */}
      {offer.threadId && (
        <button
          type="button"
          onClick={() => alert("Conversation view coming soon")}
          className="flex items-center justify-center gap-2 w-full mt-2 px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50 transition border border-gray-300"
        >
          <MessageSquare size={16} />
          View conversation
        </button>
      )}
    </div>
  );
}
