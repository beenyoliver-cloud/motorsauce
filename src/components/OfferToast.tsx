// src/components/OfferToast.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Offer,
  dismissToast,
  formatGBP,
  latestOffer,
  listOffers,
  updateOfferStatus,
  wasToastDismissed,
  createOffer,
} from "@/lib/offersStore";
import {
  appendMessage,
  nowClock,
  updateOfferInThread,
  appendOfferMessage,
} from "@/lib/chatStore";
import { getCurrentUserSync } from "@/lib/auth";
import { displayName } from "@/lib/names";

export default function OfferToast({
  threadId,
  forceShow = false,
}: {
  threadId: string;
  forceShow?: boolean;
}) {
  const [offers, setOffers] = useState<Offer[]>(() => listOffers(threadId));
  const [counter, setCounter] = useState(false);
  const [amount, setAmount] = useState("");

  const me = getCurrentUserSync();
  const selfName = me?.name?.trim() || "You";

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

  // Only show if the latest is PENDING *and* created by "You" (buyer-only toast)
  const last = useMemo(() => {
    const o = latestOffer(threadId);
    return o && o.status === "pending" && o.from === "You" ? o : undefined;
  }, [offers, threadId]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!last) return setVisible(false);
    if (forceShow) return setVisible(true);
    setVisible(!wasToastDismissed(threadId, last.id));
  }, [last, forceShow, threadId]);

  if (!last || !visible) return null;

  // Buyer-only view
  const title = "Offer sent (pending)";

  function close() {
    if (!last) return;
    dismissToast(threadId, last.id);
    setVisible(false);
  }

  function withdraw() {
    if (!last) return;
    const upd = updateOfferStatus(threadId, last.id, "withdrawn");
    if (upd) {
      updateOfferInThread(threadId, {
        id: last.id,
        amountCents: last.amountCents,
        currency: last.currency,
        status: "withdrawn",
        starterId: last.starterId,
        recipientId: last.recipientId,
      });
      appendMessage(threadId, {
        id: `offer-${last.id}-withdrawn`,
        from: "system",
        text: `${displayName(selfName)} withdrew the offer of ${formatGBP(last.amountCents)}.`,
        ts: nowClock(),
        type: "system",
      });
    }
    close();
  }

  function sendCounter() {
    if (!last) return;
    const pounds = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(pounds) || pounds <= 0) return;

    // 1) Supersede current
    updateOfferStatus(threadId, last.id, "countered");
    updateOfferInThread(threadId, {
      id: last.id,
      amountCents: last.amountCents,
      currency: last.currency,
      status: "countered",
      starterId: last.starterId,
      recipientId: last.recipientId,
    });

    // 2) New pending back to peer
    const newOffer = createOffer({
      threadId,
      from: "You",
      amountCents: Math.round(pounds * 100),
      currency: "GBP",
      listingId: last.listingId,
      listingTitle: last.listingTitle,
      listingImage: last.listingImage,
      peerName: last.peerName,
    });

    // 3) Append as an offer card
    appendOfferMessage(threadId, {
      id: newOffer.id,
      amountCents: newOffer.amountCents,
      currency: newOffer.currency ?? "GBP",
      status: "pending",
      starter: selfName,
      recipient: last.peerName,
      listingId: last.listingId,
      listingTitle: last.listingTitle,
      listingImage: last.listingImage,
    });

    appendMessage(threadId, {
      id: `offer-${newOffer.id}-counter`,
      from: "system",
      text: `${displayName(selfName)} countered with ${formatGBP(newOffer.amountCents)}.`,
      ts: nowClock(),
      type: "system",
    });

    setCounter(false);
    setAmount("");
    close();
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2">
      <div className="pointer-events-auto w-[92vw] max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start gap-3 p-3">
          {last.listingImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={last.listingImage}
              alt=""
              className="h-16 w-24 rounded-md object-cover bg-gray-100"
            />
          ) : (
            <div className="h-16 w-24 rounded-md bg-gray-100" />
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-black">{title}</div>
                {last.listingTitle && (
                  <div className="text-xs text-gray-700 line-clamp-1">{last.listingTitle}</div>
                )}
              </div>
              <button
                onClick={close}
                className="ml-3 rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-2 text-lg font-bold text-gray-900">
              {formatGBP(last.amountCents)}
            </div>

            {/* Buyer actions only */}
            {!counter ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCounter(true)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Counter offer
                </button>
                <button
                  onClick={withdraw}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Withdraw
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Counter £"
                  className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={sendCounter}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setCounter(false);
                    setAmount("");
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
