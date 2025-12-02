// src/components/OfferMessage.tsx
"use client";

import { useMemo, useState } from "react";
import { CheckCircle, XCircle, Clock, Ban, TrendingUp, Package } from "lucide-react";
import { createOffer, formatGBP } from "@/lib/offersStore";
import { updateOfferStatus as updateOfferStatusAPI } from "@/lib/messagesClient";
import { appendMessage, nowClock, updateOfferInThread, appendOfferMessage } from "@/lib/chatStore";
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
      status: "pending" | "accepted" | "declined" | "countered" | "withdrawn";
      starter?: string;
      recipient?: string;
      starterId?: string;   // ← added
      recipientId?: string; // ← added
      buyerId?: string;     // optional (we infer from starterId on first offer)
      sellerId?: string;    // optional (we infer from recipientId on first offer)
      listingId: string | number;
      listingTitle?: string;
      listingImage?: string;
      peerName?: string;
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

  function sysLine(text: string) {
    appendMessage(msg.threadId, {
      id: `sys_${Date.now()}`,
      from: "system",
      ts: nowClock(),
      type: "system",
      text,
    });
  }

  // Actions
    async function withdraw() {
    if (!(o.status === "pending" && isMeBuyer && iAmStarter)) return; // only buyer withdrawing their own pending
      await updateOfferStatusAPI(o.id, "withdrawn");
    updateOfferInThread(msg.threadId, {
      id: o.id,
      amountCents: o.amountCents,
      currency: o.currency,
      status: "withdrawn",
      starterId: o.starterId,
      recipientId: o.recipientId,
    });
    sysLine(`${displayName(selfName)} withdrew the offer of ${formatGBP(o.amountCents)}.`);
  }

    async function accept() {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) return; // only seller, as recipient
      await updateOfferStatusAPI(o.id, "accepted");
    updateOfferInThread(msg.threadId, {
      id: o.id,
      amountCents: o.amountCents,
      currency: o.currency,
      status: "accepted",
      starterId: o.starterId,
      recipientId: o.recipientId,
    });
    sysLine(`${displayName(selfName)} accepted the offer of ${formatGBP(o.amountCents)}.`);
  }

    async function decline() {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) return; // only seller, as recipient
      await updateOfferStatusAPI(o.id, "declined");
    updateOfferInThread(msg.threadId, {
      id: o.id,
      amountCents: o.amountCents,
      currency: o.currency,
      status: "declined",
      starterId: o.starterId,
      recipientId: o.recipientId,
    });
    sysLine(`${displayName(selfName)} declined the offer of ${formatGBP(o.amountCents)}.`);
  }

    async function counterSubmit() {
    // Seller can counter when they are the recipient of buyer's pending offer
    // Buyer can counter only when they are the recipient of a seller counter
    const canSellerCounter = o.status === "pending" && isMeSeller && iAmRecipient;
    const canBuyerCounter  = o.status === "pending" && isMeBuyer  && iAmRecipient; // “buyer only after seller counter”

    if (!(canSellerCounter || canBuyerCounter)) return;

    const pounds = parseFloat(counter.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) return;

    // 1) Supersede current
      await updateOfferStatusAPI(o.id, "countered");
    updateOfferInThread(msg.threadId, {
      id: o.id,
      amountCents: o.amountCents,
      currency: o.currency,
      status: "countered",
      starterId: o.starterId,
      recipientId: o.recipientId,
    });

    // 2) New pending from me → back to the other party, keep the listing photo/title
    const newOffer = createOffer({
      threadId: msg.threadId,
      from: "You",
      amountCents: Math.round(pounds * 100),
      currency: "GBP",
      listingId: o.listingId,
      listingTitle: o.listingTitle || "",
      listingImage: o.listingImage,
      peerName: o.peerName || "",
    });

    // 3) Append the counter card (propagate buyer/seller ids so the next step knows roles)
    appendOfferMessage(msg.threadId, {
      id: newOffer.id,
      amountCents: newOffer.amountCents,
      currency: newOffer.currency ?? "GBP",
      status: "pending",
      starter: selfName,
      starterId: selfId,
      recipient: iAmRecipient ? (o.starter || "Unknown") : (o.recipient || "Unknown"),
      recipientId: iAmRecipient ? o.starterId : o.recipientId,
      buyerId,
      sellerId,
      listingId: o.listingId,
      listingTitle: o.listingTitle,
      listingImage: o.listingImage,
      peerName: o.peerName,
      peerId: iAmRecipient ? o.starterId : o.recipientId,
    });

    sysLine(`${displayName(selfName)} countered with ${formatGBP(newOffer.amountCents)}.`);
    setCounter("");
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
    <div className={`my-3 rounded-xl border-2 ${
      o.status === "pending" ? "border-yellow-500 bg-yellow-50" : "border-gray-200 bg-white"
    } shadow-md overflow-hidden ${resolvedClasses}`}>
      {/* Status Banner */}
      <div className={`px-4 py-2 flex items-center justify-between ${statusBadge.classes} border-b-2`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </div>
        <Package size={16} />
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {/* Listing Image */}
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={img} 
              alt="" 
              className="site-image h-20 w-28 rounded-lg bg-gray-100 border border-gray-200 object-cover"
            />
          ) : (
            <div className="h-20 w-28 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Package size={24} className="text-gray-400" />
            </div>
          )}

          {/* Offer Details */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {headerLabel}
            </div>
            {!!o.listingTitle && (
              <div className="text-sm font-semibold text-black line-clamp-2 mt-0.5">
                {o.listingTitle}
              </div>
            )}
            <div className="mt-2 text-2xl font-bold text-black">
              {formatGBP(o.amountCents)}
            </div>
          </div>
        </div>

        {/* Actions */}
        {o.status === "pending" ? (
          <div className="mt-4 space-y-3">
            {showSellerActions && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button 
                    onClick={accept} 
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Accept Offer
                  </button>
                  <button 
                    onClick={decline} 
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
                    <input
                      value={counter}
                      onChange={(e) => setCounter(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                  <button 
                    onClick={counterSubmit} 
                    disabled={!counter} 
                    className="px-4 py-2.5 rounded-lg border-2 border-yellow-500 bg-white text-yellow-700 font-semibold text-sm hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                  >
                    <TrendingUp size={16} />
                    Send Counter
                  </button>
                </div>
              </div>
            )}

            {showWithdraw && (
              <button 
                onClick={withdraw} 
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Ban size={16} />
                Withdraw Offer
              </button>
            )}

            {showBuyerCounter && (
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
                  <input
                    value={counter}
                    onChange={(e) => setCounter(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <button 
                  onClick={counterSubmit} 
                  disabled={!counter} 
                  className="px-4 py-2.5 rounded-lg border-2 border-yellow-500 bg-white text-yellow-700 font-semibold text-sm hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <TrendingUp size={16} />
                  Send Counter
                </button>
              </div>
            )}

            {!showSellerActions && !showWithdraw && !showBuyerCounter && (
              <div className="text-center py-2 text-sm text-gray-600 flex items-center justify-center gap-2">
                <Clock size={16} />
                <span>Waiting for response...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 text-center">
              This offer has been <span className="font-semibold">{statusBadge.label.toLowerCase()}</span>.
            </p>
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
