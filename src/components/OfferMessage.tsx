// src/components/OfferMessage.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, Ban, TrendingUp, Package } from "lucide-react";
import { formatGBP } from "@/lib/offersStore";
import { updateOfferStatus as updateOfferStatusAPI, sendMessage, createOffer as createOfferAPI } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";
import { getCurrentUserSync } from "@/lib/auth";

type Props = {
  msg: {
    id: string;
    threadId: string;
    type?: "offer" | "system";
    offer?: {
      id: string;
      amountCents: number;
      currency: string;
      status: "pending" | "accepted" | "declined" | "rejected" | "countered" | "withdrawn" | "expired";
      starter?: string;
      recipient?: string;
      starterId?: string;
      recipientId?: string;
      buyerId?: string | null;
      sellerId?: string | null;
      listingId: string | number;
      listingTitle?: string | null;
      listingImage?: string | null;
      peerName?: string;
      expires_at?: string | null;
      quantity?: number;
    };
  };
  currentUser: string;
};

function meId() {
  const me = getCurrentUserSync();
  return {
    id: String(me?.id || me?.email || me?.name || ""),
    name: (me?.name || "You").trim(),
  };
}

function OfferMessageInner({ msg, o }: { msg: Props["msg"]; o: NonNullable<Props["msg"]["offer"]> }) {
  const { id: selfId, name: selfName } = meId();

  // Try to determine fixed buyer/seller for the thread using the fields we set in MakeOfferButton
  const buyerId = o.buyerId || o.starterId;    // for the very first offer, starterId === buyer
  const sellerId = o.sellerId || o.recipientId; // for the very first offer, recipientId === seller

  const isMeBuyer = buyerId ? buyerId === selfId : (o.starter === "You");
  const isMeSeller = sellerId ? sellerId === selfId : !isMeBuyer;

  // For the current *pending* offer: who sent it, who receives it?
  const iAmStarter = (o.starterId && o.starterId === selfId) || (!o.starterId && o.starter === "You");
  const iAmRecipient = (o.recipientId && o.recipientId === selfId) || (!o.recipientId && !iAmStarter);

  const [counter, setCounter] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendSystemMessage(text: string) {
    try {
      console.log(`[OfferMessage] Sending system message: ${text}`);
      const result = await sendMessage(msg.threadId, text);
      console.log(`[OfferMessage] System message sent successfully:`, result);
    } catch (err) {
      console.error(`[OfferMessage] Failed to send system message:`, err);
      alert("Failed to send message");
    }
  }

  // Actions with proper error handling and logging
  const withdraw = async () => {
    if (!(o.status === "pending" && isMeBuyer && iAmStarter)) return;
    setLoading(true);
    try {
      console.log(`[OfferMessage] Withdrawing offer ${o.id}`);
      const result = await updateOfferStatusAPI(o.id, "withdrawn");
      console.log(`[OfferMessage] Offer withdrawn:`, result);
      await sendSystemMessage(`${displayName(selfName)} withdrew the offer of ${formatGBP(o.amountCents)}.`);
      
      // Notify UI to refresh threads and messages
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ms:threads"));
      }
    } catch (err) {
      console.error(`[OfferMessage] Error withdrawing offer:`, err);
      alert("Failed to withdraw offer");
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) {
      console.log(`[OfferMessage] Accept blocked - status: ${o.status}, isMeSeller: ${isMeSeller}, iAmRecipient: ${iAmRecipient}`);
      return;
    }
    setLoading(true);
    try {
      console.log(`[OfferMessage] Accepting offer ${o.id} for listing ${o.listingId || 'unknown'}`);
      const result = await updateOfferStatusAPI(o.id, "accepted");
      console.log(`[OfferMessage] Offer accepted:`, result);
      await sendSystemMessage(`${displayName(selfName)} accepted the offer of ${formatGBP(o.amountCents)}.`);
      
      // Notify UI to refresh threads and messages
      if (typeof window !== "undefined") {
        console.log(`[OfferMessage] Dispatching ms:threads event to refresh UI`);
        window.dispatchEvent(new Event("ms:threads"));
      }
      
      if (!buyerId) {
        console.warn("[OfferMessage] Missing buyer id, unable to send notification");
      }
    } catch (err) {
      console.error(`[OfferMessage] Error accepting offer:`, err);
      alert("Failed to accept offer");
    } finally {
      setLoading(false);
    }
  };

  const decline = async () => {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) {
      console.log(`[OfferMessage] Decline blocked - status: ${o.status}, isMeSeller: ${isMeSeller}, iAmRecipient: ${iAmRecipient}`);
      return;
    }
    setLoading(true);
    try {
      console.log(`[OfferMessage] Declining offer ${o.id} for listing ${o.listingId || 'unknown'}`);
      const result = await updateOfferStatusAPI(o.id, "declined");
      console.log(`[OfferMessage] Offer declined:`, result);
      await sendSystemMessage(`${displayName(selfName)} declined the offer of ${formatGBP(o.amountCents)}.`);
      
      // Notify UI to refresh threads and messages
      if (typeof window !== "undefined") {
        console.log(`[OfferMessage] Dispatching ms:threads event to refresh UI`);
        window.dispatchEvent(new Event("ms:threads"));
      }
    } catch (err) {
      console.error(`[OfferMessage] Error declining offer:`, err);
      alert("Failed to decline offer");
    } finally {
      setLoading(false);
    }
  };

    async function counterSubmit() {
    // Seller can counter when they are the recipient of buyer's pending offer
    // Buyer can counter only when they are the recipient of a seller counter
    const canSellerCounter = o.status === "pending" && isMeSeller && iAmRecipient;
    const canBuyerCounter  = o.status === "pending" && isMeBuyer  && iAmRecipient; // "buyer only after seller counter"

    if (!(canSellerCounter || canBuyerCounter)) {
      console.log(`[OfferMessage] Counter blocked - canSellerCounter: ${canSellerCounter}, canBuyerCounter: ${canBuyerCounter}`);
      return;
    }

    const pounds = parseFloat(counter.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const counterAmountCents = Math.round(pounds * 100);
      console.log(
        `[OfferMessage] Countering offer ${o.id} with £${pounds} for listing ${o.listingId || "unknown"}`
      );

      if (o.listingId === undefined || o.listingId === null || o.listingId === "") {
        throw new Error("Missing listing reference for counter offer");
      }

      const targetRecipientId =
        (o.starterId && o.starterId !== selfId && o.starterId) ||
        (o.recipientId && o.recipientId !== selfId && o.recipientId) ||
        (iAmRecipient ? o.starterId : o.recipientId);

      if (!targetRecipientId) {
        throw new Error("Unable to determine who should receive the counter offer");
      }

      const result = await updateOfferStatusAPI(o.id, "countered", counterAmountCents);
      console.log(`[OfferMessage] Offer countered:`, result);
      await sendSystemMessage(`${displayName(selfName)} countered with ${formatGBP(counterAmountCents)}.`);

      // Notify UI to refresh threads and messages
      if (typeof window !== "undefined") {
        console.log(`[OfferMessage] Dispatching ms:threads event to refresh UI`);
        window.dispatchEvent(new Event("ms:threads"));
      }

      const created = await createOfferAPI({
        threadId: msg.threadId,
        amountCents: counterAmountCents,
        currency: o.currency || "GBP",
      });
      console.log("[OfferMessage] Counter offer created:", created);

      setCounter("");
    } catch (err) {
      console.error(`[OfferMessage] Error countering offer:`, err);
      alert(err instanceof Error ? err.message : "Failed to send counter offer");
    } finally {
      setLoading(false);
    }
  }

  // UI state with icons
  const statusBadge = (() => {
    switch (o.status) {
      case "accepted":  return { 
        label: "Accepted",   
        classes: "bg-green-50 text-green-800 border-green-300",
        icon: <CheckCircle size={14} className="inline" />
      };
      case "declined":  return { 
        label: "Declined",   
        classes: "bg-red-50 text-red-800 border-red-300",
        icon: <XCircle size={14} className="inline" />
      };
      case "countered": return { 
        label: "Countered", 
        classes: "bg-orange-50 text-orange-800 border-orange-300",
        icon: <TrendingUp size={14} className="inline" />
      };
      case "withdrawn": return { 
        label: "Withdrawn",  
        classes: "bg-gray-100 text-gray-700 border-gray-300",
        icon: <Ban size={14} className="inline" />
      };
      default:          return { 
        label: "Pending",    
        classes: "bg-blue-50 text-blue-800 border-blue-300",
        icon: <Clock size={14} className="inline" />
      };
    }
  })();

  const headerLabel = iAmStarter ? "Your offer" : `Offer from ${displayName(o.starter || "Unknown")}`;
  const resolvedClasses = o.status === "pending" ? "" : "opacity-70";
  const img = (o.listingImage || "").trim();

  // Action gates (exactly as requested)
  const showWithdraw = o.status === "pending" && isMeBuyer  && iAmStarter;
  const showSellerActions = o.status === "pending" && isMeSeller && iAmRecipient;
  const showBuyerCounter = o.status === "pending" && isMeBuyer  && iAmRecipient; // only after seller counter

  return (
    <div className={`my-3 rounded-lg border-l-4 ${
      o.status === "pending" ? "border-l-yellow-500 bg-yellow-50/50" : "border-l-gray-300 bg-gray-50/30"
    } shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
      {/* Header with Status Badge */}
      <div className="px-4 py-3 flex items-start justify-between border-b border-gray-200/50">
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            {headerLabel}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.classes}`}>
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Link 
          href={`/listing/${o.listingId}`}
          className="block group hover:opacity-90 transition mb-4"
        >
          <div className="flex gap-3 items-start">
            {/* Listing Image - Larger and more prominent */}
            <div className="flex-shrink-0">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={img} 
                  alt="" 
                  className="h-24 w-32 rounded-lg bg-gray-100 border border-gray-200 object-cover shadow-sm group-hover:shadow-md transition-shadow"
                />
              ) : (
                <div className="h-24 w-32 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm">
                  <Package size={28} className="text-gray-300" />
                </div>
              )}
            </div>

            {/* Offer Details */}
            <div className="flex-1 min-w-0">
              {/* Listing Title */}
              {!!o.listingTitle && (
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-yellow-700 transition">
                  {o.listingTitle}
                </h4>
              )}
              
              {/* Offer Amount - Prominent */}
              <div className="mb-2">
                <div className="text-2xl font-bold text-gray-900">
                  {formatGBP(o.amountCents)}
                </div>
              </div>

              {/* Seller/Buyer info */}
              <div className="text-xs text-gray-600 space-y-0.5">
                {iAmStarter && (
                  <p><span className="font-medium">Sent to seller</span> on {new Date().toLocaleDateString()}</p>
                )}
                {iAmRecipient && !iAmStarter && (
                  <p><span className="font-medium">Offer from buyer</span> on {new Date().toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Action Buttons - Improved Layout */}
        {o.status === "pending" && (showSellerActions || showWithdraw || showBuyerCounter) && (
          <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-3">
            {showSellerActions && (
              <>
                {/* Accept/Decline buttons for seller */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={accept}
                    disabled={loading}
                    className="rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    <span>{loading ? "..." : "Accept"}</span>
                  </button>
                  <button 
                    onClick={decline}
                    disabled={loading}
                    className="rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle size={16} />
                    <span>{loading ? "..." : "Decline"}</span>
                  </button>
                </div>
                
                {/* Counter offer for seller */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Counter Offer</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">£</span>
                      <input
                        value={counter}
                        onChange={(e) => setCounter(e.target.value)}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-gray-300 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      />
                    </div>
                    <button 
                      onClick={counterSubmit}
                      disabled={!counter || loading}
                      className="px-3 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center gap-1.5"
                    >
                      <TrendingUp size={16} />
                      <span>{loading ? "..." : "Counter"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {showWithdraw && (
              <button 
                onClick={withdraw}
                disabled={loading}
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban size={16} />
                {loading ? "..." : "Withdraw Offer"}
              </button>
            )}

            {showBuyerCounter && (
              <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                <label className="text-xs font-semibold text-gray-700">Send Counter Offer</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">£</span>
                    <input
                      value={counter}
                      onChange={(e) => setCounter(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-gray-300 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={counterSubmit} 
                    disabled={!counter} 
                    className="px-3 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md flex items-center gap-1.5"
                  >
                    <TrendingUp size={16} />
                    <span>Counter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resolved State */}
        {o.status !== "pending" && (
          <div className="mt-3 space-y-3">
            <div className="px-3 py-2.5 bg-gray-100 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 text-center font-medium">
                Offer <span className="font-semibold text-gray-900">{statusBadge.label.toLowerCase()}</span>
              </p>
            </div>
            
            {/* Checkout button for buyer when offer is accepted */}
            {o.status === "accepted" && isMeBuyer && (
              <Link
                href={`/checkout?offer=${o.id}&listing=${o.listingId}`}
                className="w-full block text-center rounded-lg bg-yellow-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600 transition-colors shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-center gap-2">
                  <Package size={16} />
                  <span>Proceed to Payment</span>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* No actions available */}
        {o.status === "pending" && !showSellerActions && !showWithdraw && !showBuyerCounter && (
          <div className="mt-3 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-center gap-2">
            <Clock size={14} className="text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Waiting for response...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfferMessage({ msg }: Props) {
  if (msg.type !== "offer" || !msg.offer) return null;
  return <OfferMessageInner msg={msg} o={msg.offer} />;
}
