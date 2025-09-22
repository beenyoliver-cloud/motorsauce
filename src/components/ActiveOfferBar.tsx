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
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";

/**
 * Canonical control for the current pending offer in this thread.
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
  const me = getCurrentUser();
  const selfName = me?.name?.trim() || "You";
  const selfId = String(me?.id || me?.email || me?.name || "");

  // Keep offers in sync
  const [offers, setOffers] = useState(() => listOffers(threadId));
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

  if (!active) return null;

  // Determine whether current user is the sender or the recipient of the active offer
  const isFromMe =
    active.from === "You" ||
    (active.starterId && active.starterId === selfId);

  const iAmRecipient =
    (!!active.recipientId && active.recipientId === selfId) ||
    (!active.recipientId && active.from !== "You"); // fallback: if not from me, it's “to me”

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

  function accept() {
    // Only recipient can accept
    if (!iAmRecipient) return;
    const upd = updateOfferStatus(threadId, active.id, "accepted");
    if (upd) {
      updateOfferInThread(threadId, { id: active.id, amountCents: active.amountCents, status: "accepted" } as any);
      sys(`${displayName(selfName)} accepted the offer of ${formatGBP(active.amountCents)}.`);
      // optional: navigate to checkout
      // router.push(`/checkout?offer=${active.id}`)
    }
  }

  function decline() {
    if (!iAmRecipient) return;
    const upd = updateOfferStatus(threadId, active.id, "declined");
    if (upd) {
      updateOfferInThread(threadId, { id: active.id, amountCents: active.amountCents, status: "declined" } as any);
      sys(`${displayName(selfName)} declined the offer of ${formatGBP(active.amountCents)}.`);
    }
  }

  function quickCounter(mult: number) {
    if (!iAmRecipient) return;

    const next = Math.max(1, Math.round(active.amountCents * mult));

    // 1) Supersede current
    updateOfferStatus(threadId, active.id, "countered");
    updateOfferInThread(threadId, { id: active.id, amountCents: active.amountCents, status: "countered" } as any);

    // 2) Create a NEW pending from me → back to the other party
    const newOffer = createOffer({
      threadId,
      from: "You",
      amountCents: next,
      currency: "GBP",
      listingId: active.listingId,
      listingTitle: active.listingTitle,
      listingImage: active.listingImage, // propagate image so it never becomes a “?”
      peerName: active.peerName,         // offersStore uses name; chatStore enriches IDs
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
    } as any);

    sys(`${displayName(selfName)} countered with ${formatGBP(newOffer.amountCents)}.`);
    setOffers(listOffers(threadId));
  }

  return (
    <div className="border-b border-gray-200 bg-yellow-50 p-3">
      <div className="flex items-start gap-3">
        {showImage ? (
          active.listingImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.listingImage}
              alt=""
              className="h-14 w-20 rounded-md object-cover bg-gray-100"
            />
          ) : (
            <div className="h-14 w-20 rounded-md bg-gray-100" />
          )
        ) : null}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black">{title}</div>
              {active.listingTitle && (
                <div className="text-xs text-gray-700 line-clamp-1">{active.listingTitle}</div>
              )}
            </div>

            <div className="text-lg font-bold text-gray-900">{formatGBP(active.amountCents)}</div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {iAmRecipient ? (
              <>
                <button
                  onClick={accept}
                  className="rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-900"
                >
                  Accept
                </button>
                <button
                  onClick={decline}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Decline
                </button>
                <button
                  onClick={() => quickCounter(0.95)}
                  className="rounded-md bg-white px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Counter −5%
                </button>
                <button
                  onClick={() => quickCounter(0.9)}
                  className="rounded-md bg-white px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Counter −10%
                </button>
              </>
            ) : (
              <div className="text-xs text-gray-700">Waiting for the other party…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
