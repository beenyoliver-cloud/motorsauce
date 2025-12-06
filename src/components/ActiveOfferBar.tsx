// src/components/ActiveOfferBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  latestOffer,
  listOffers,
  updateOfferStatus,
  createOffer,
  formatGBP,
} from "@/lib/offersStore";
import {
  appendMessage,
  nowClock,
  updateOfferInThread,
  appendOfferMessage,
} from "@/lib/chatStore";
import { getCurrentUserSync } from "@/lib/auth";
import { displayName } from "@/lib/names";

/**
 * Elegant dark-themed offer card for making and responding to offers.
 * Integrates with the existing offer system (offersStore + chatStore).
 * 
 * RULES:
 *  - Only the RECIPIENT of the active (pending) offer can Act (Accept / Decline / Counter).
 *  - The SENDER of the active pending offer gets no actions (waiting state).
 *  - Accept (by seller) confirms purchase at offered amount.
 *  - Decline closes the offer.
 *  - Counter supersedes previous pending (marks it countered) and creates a new pending.
 */
export default function ActiveOfferBar({
  threadId,
  showImage = true,
}: {
  threadId: string;
  showImage?: boolean;
}) {
  const me = getCurrentUserSync();
  const selfName = me?.name?.trim() || "You";
  const selfId = String(me?.id || me?.email || me?.name || "");

  // Keep offers in sync
  const [offers, setOffers] = useState(() => listOffers(threadId));
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  useEffect(() => {
    const onOffers = (e: Event) => {
      const detail = (e as CustomEvent).detail as { threadId?: string } | undefined;
      if (!detail || detail.threadId === threadId) {
        setOffers(listOffers(threadId));
      }
    };
    window.addEventListener("ms:offers", onOffers as EventListener);
    return () => window.removeEventListener("ms:offers", onOffers as EventListener);
  }, [threadId]);

  const active = useMemo(() => {
    const o = latestOffer(threadId);
    return o && o.status === "pending" ? o : undefined;
  }, [offers, threadId]);

  useEffect(() => {
    if (!active) {
      setShowCounterInput(false);
      setCounterAmount("");
    }
  }, [active]);

  if (!active) return null;

  // Determine whether current user is the sender or the recipient of the active offer
  const isFromMe =
    active.from === "You" ||
    (active.starterId && active.starterId === selfId);

  const iAmRecipient =
    (!!active.recipientId && active.recipientId === selfId) ||
    (!active.recipientId && active.from !== "You"); // fallback: if not from me, it's "to me"

  const title = isFromMe
    ? "Offer sent (pending)"
    : `${displayName(active.from)} sent you an offer`;

  function sys(text: string) {
    appendMessage(threadId, {
      id: `sys_${Date.now()}`,
      from: "system",
      ts: nowClock(),
      type: "system",
      text,
    });
  }

  function onAccept() {
    // Only recipient can accept
    if (!iAmRecipient) return;
    if (!active) return;
    const upd = updateOfferStatus(threadId, active.id, "accepted");
    if (upd) {
      updateOfferInThread(threadId, {
        id: active.id,
        amountCents: active.amountCents,
        currency: active.currency,
        status: "accepted",
        starterId: active.starterId,
        recipientId: active.recipientId,
      });
      sys(`${displayName(selfName)} accepted the offer of ${formatGBP(active.amountCents)}.`);
    }
  }

  function onDecline() {
    if (!iAmRecipient) return;
    if (!active) return;
    const upd = updateOfferStatus(threadId, active.id, "declined");
    if (upd) {
      updateOfferInThread(threadId, {
        id: active.id,
        amountCents: active.amountCents,
        currency: active.currency,
        status: "declined",
        starterId: active.starterId,
        recipientId: active.recipientId,
      });
      sys(`${displayName(selfName)} declined the offer of ${formatGBP(active.amountCents)}.`);
    }
  }

  function onCounter() {
    if (showCounterInput) {
      // Submit counter offer
      if (!iAmRecipient) return;
      if (!active) return;

      const amountInPounds = parseFloat(counterAmount);
      if (!amountInPounds || amountInPounds <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      const nextAmount = Math.round(amountInPounds * 100); // Convert to cents

      // 1) Supersede current
      updateOfferStatus(threadId, active.id, "countered");
      updateOfferInThread(threadId, {
        id: active.id,
        amountCents: active.amountCents,
        currency: active.currency,
        status: "countered",
        starterId: active.starterId,
        recipientId: active.recipientId,
      });

      // 2) Create a NEW pending from me → back to the other party
      const newOffer = createOffer({
        threadId,
        from: "You",
        amountCents: nextAmount,
        currency: "GBP",
        listingId: active.listingId,
        listingTitle: active.listingTitle,
        listingImage: active.listingImage,
        peerName: active.peerName,
      });

      // 3) Append as a new offer card (idempotent)
      appendOfferMessage(threadId, {
        id: newOffer.id,
        amountCents: newOffer.amountCents,
        currency: newOffer.currency ?? "GBP",
        status: "pending",
        starter: selfName,
        recipient: active.peerName,
        listingId: active.listingId,
        listingTitle: active.listingTitle,
        listingImage: active.listingImage,
      });

      sys(`${displayName(selfName)} countered with ${formatGBP(newOffer.amountCents)}.`);
      setOffers(listOffers(threadId));
      setShowCounterInput(false);
      setCounterAmount("");
    } else {
      // Show counter input
      setShowCounterInput(true);
      // Pre-fill with 5% less
      if (active) {
        const suggested = (active.amountCents * 0.95) / 100;
        setCounterAmount(suggested.toFixed(2));
      }
    }
  }

  // Extract original price (if available, otherwise show offered price as original)
  const originalPrice = active.amountCents;
  const offeredPrice = active.amountCents;

  return (
    <div className="bg-[#050608] rounded-lg p-4 shadow-lg border border-gray-800 mb-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {showImage ? (
          active.listingImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.listingImage}
              alt={active.listingTitle || "Item"}
              className="w-12 h-12 rounded-md object-cover bg-gray-800"
            />
          ) : (
            <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
              No image
            </div>
          )
        ) : null}

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">
            {active.listingTitle || "Item"}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">{title}</p>
        </div>
      </div>

      {/* Price comparison */}
      <div className="flex items-center justify-between mb-4 bg-[#0a0d10] rounded-md p-3">
        <div>
          <p className="text-gray-400 text-xs mb-1">Original Price</p>
          <p className="text-gray-500 line-through text-sm">
            {formatGBP(originalPrice)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#D4AF37] text-xs mb-1">Offered Price</p>
          <p className="text-[#D4AF37] font-bold text-lg">
            {formatGBP(offeredPrice)}
          </p>
        </div>
      </div>

      {/* Counter input (if shown) */}
      {showCounterInput && iAmRecipient && (
        <div className="mb-3">
          <label className="text-gray-400 text-xs mb-1.5 block">
            Your counter offer (£)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            className="w-full bg-[#0a0d10] border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            placeholder="Enter amount"
            autoFocus
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {iAmRecipient ? (
          <>
            <button
              onClick={onAccept}
              className="flex-1 bg-[#D4AF37] text-black font-semibold py-2.5 rounded-md hover:bg-[#c49f2f] transition-colors text-sm"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 bg-gray-800 text-white font-semibold py-2.5 rounded-md hover:bg-gray-700 transition-colors text-sm border border-gray-700"
            >
              Decline
            </button>
            <button
              onClick={onCounter}
              className="flex-1 bg-transparent text-[#D4AF37] font-semibold py-2.5 rounded-md hover:bg-[#D4AF37] hover:bg-opacity-10 transition-colors text-sm border border-[#D4AF37]"
            >
              {showCounterInput ? "Submit" : "Counter"}
            </button>
          </>
        ) : (
          <div className="w-full text-center py-2.5 text-gray-400 text-sm">
            Waiting for response...
          </div>
        )}
      </div>

      {/* Cancel counter (if shown) */}
      {showCounterInput && iAmRecipient && (
        <button
          onClick={() => {
            setShowCounterInput(false);
            setCounterAmount("");
          }}
          className="w-full text-gray-500 text-xs mt-2 hover:text-gray-400 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
