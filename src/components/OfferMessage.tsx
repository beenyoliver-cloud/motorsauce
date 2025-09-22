// src/components/OfferMessage.tsx
"use client";

import { useMemo, useState } from "react";
import { createOffer, updateOfferStatus, formatGBP } from "@/lib/offersStore";
import { appendMessage, nowClock, updateOfferInThread, appendOfferMessage } from "@/lib/chatStore";
import { displayName } from "@/lib/names";
import { getCurrentUser } from "@/lib/auth";

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
  const me = getCurrentUser();
  return {
    id: String(me?.id || me?.email || me?.name || ""),
    name: (me?.name || "You").trim(),
  };
}

export default function OfferMessage({ msg }: Props) {
  if (msg.type !== "offer" || !msg.offer) return null;
  const o = msg.offer;
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
  function withdraw() {
    if (!(o.status === "pending" && isMeBuyer && iAmStarter)) return; // only buyer withdrawing their own pending
    updateOfferStatus(msg.threadId, o.id, "withdrawn");
    updateOfferInThread(msg.threadId, { id: o.id, amountCents: o.amountCents, status: "withdrawn" } as any);
    sysLine(`${displayName(selfName)} withdrew the offer of ${formatGBP(o.amountCents)}.`);
  }

  function accept() {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) return; // only seller, as recipient
    updateOfferStatus(msg.threadId, o.id, "accepted");
    updateOfferInThread(msg.threadId, { id: o.id, amountCents: o.amountCents, status: "accepted" } as any);
    sysLine(`${displayName(selfName)} accepted the offer of ${formatGBP(o.amountCents)}.`);
  }

  function decline() {
    if (!(o.status === "pending" && isMeSeller && iAmRecipient)) return; // only seller, as recipient
    updateOfferStatus(msg.threadId, o.id, "declined");
    updateOfferInThread(msg.threadId, { id: o.id, amountCents: o.amountCents, status: "declined" } as any);
    sysLine(`${displayName(selfName)} declined the offer of ${formatGBP(o.amountCents)}.`);
  }

  function counterSubmit() {
    // Seller can counter when they are the recipient of buyer's pending offer
    // Buyer can counter only when they are the recipient of a seller counter
    const canSellerCounter = o.status === "pending" && isMeSeller && iAmRecipient;
    const canBuyerCounter  = o.status === "pending" && isMeBuyer  && iAmRecipient; // “buyer only after seller counter”

    if (!(canSellerCounter || canBuyerCounter)) return;

    const pounds = parseFloat(counter.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) return;

    // 1) Supersede current
    updateOfferStatus(msg.threadId, o.id, "countered");
    updateOfferInThread(msg.threadId, { id: o.id, amountCents: o.amountCents, status: "countered" } as any);

    // 2) New pending from me → back to the other party, keep the listing photo/title
    const newOffer = createOffer({
      threadId: msg.threadId,
      from: "You",
      amountCents: Math.round(pounds * 100),
      currency: "GBP",
      listingId: o.listingId,
      listingTitle: o.listingTitle,
      listingImage: o.listingImage,
      peerName: o.peerName,
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
    } as any);

    sysLine(`${displayName(selfName)} countered with ${formatGBP(newOffer.amountCents)}.`);
    setCounter("");
  }

  // UI state
  const statusBadge = (() => {
    switch (o.status) {
      case "accepted":  return { label: "accepted",   classes: "bg-green-100 text-green-900 border-green-300" };
      case "declined":  return { label: "declined",   classes: "bg-red-100 text-red-900 border-red-300" };
      case "countered": return { label: "superseded", classes: "bg-orange-100 text-orange-900 border-orange-300" };
      case "withdrawn": return { label: "withdrawn",  classes: "bg-gray-200 text-gray-800 border-gray-300" };
      default:          return { label: "pending",    classes: "bg-blue-100 text-blue-900 border-blue-300" };
    }
  })();

  const headerLabel = iAmStarter ? "Your offer" : `${displayName(o.starter || "Unknown")}’s offer`;
  const resolvedClasses = o.status === "pending" ? "" : "opacity-60 saturate-0 pointer-events-none";
  const img = (o.listingImage || "").trim();

  // Action gates (exactly as requested)
  const showWithdraw = o.status === "pending" && isMeBuyer  && iAmStarter;
  const showSellerActions = o.status === "pending" && isMeSeller && iAmRecipient;
  const showBuyerCounter = o.status === "pending" && isMeBuyer  && iAmRecipient; // only after seller counter

  return (
    <div className={`my-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${resolvedClasses}`}>
      <div className="flex items-start gap-3">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-16 w-24 rounded-md object-cover bg-gray-100" />
        ) : (
          <div className="h-16 w-24 rounded-md bg-gray-100" />
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-black">{headerLabel}</div>
              {!!o.listingTitle && <div className="text-xs text-gray-700 line-clamp-1">{o.listingTitle}</div>}
            </div>
            <div className={`ml-2 rounded-full border px-2 py-1 text-xs font-semibold ${statusBadge.classes}`}>{statusBadge.label}</div>
          </div>

          <div className="mt-2 text-lg font-bold text-gray-900">{formatGBP(o.amountCents)}</div>

          {o.status === "pending" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {showSellerActions && (
                <>
                  <button onClick={accept} className="rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-900">Accept</button>
                  <button onClick={decline} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Decline</button>
                  <input
                    value={counter}
                    onChange={(e) => setCounter(e.target.value)}
                    inputMode="decimal"
                    placeholder="Counter £"
                    className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <button onClick={counterSubmit} disabled={!counter} className="rounded-md bg-white px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Counter</button>
                </>
              )}

              {showWithdraw && (
                <button onClick={withdraw} className="rounded-md bg-white px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50">Withdraw</button>
              )}

              {showBuyerCounter && (
                <>
                  <input
                    value={counter}
                    onChange={(e) => setCounter(e.target.value)}
                    inputMode="decimal"
                    placeholder="Counter £"
                    className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <button onClick={counterSubmit} disabled={!counter} className="rounded-md bg-white px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Counter</button>
                </>
              )}

              {!showSellerActions && !showWithdraw && !showBuyerCounter && (
                <span className="text-xs text-gray-700">Waiting for the other party…</span>
              )}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-700">This offer is <span className="font-semibold">{statusBadge.label}</span>.</div>
          )}
        </div>
      </div>
    </div>
  );
}
