// src/lib/offersStore.ts
"use client";

type Offer = {
  id: string;
  threadId: string;
  amountCents: number;
  currency?: string;
  status: "pending" | "accepted" | "declined" | "countered";
  starterId?: string;
  recipientId?: string;
  listingId?: string;
  listingTitle?: string;
  listingImage?: string;
  peerName?: string;
};

const KEY = (t: string) => `ms:offers:${t}`;

function read(threadId: string): Offer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(threadId));
    return raw ? (JSON.parse(raw) as Offer[]) : [];
  } catch {
    return [];
  }
}
function write(threadId: string, offers: Offer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(threadId), JSON.stringify(offers));
  window.dispatchEvent(new CustomEvent("ms:offers", { detail: { threadId } }));
}

export function formatGBP(cents: number) {
  return `£${(cents / 100).toFixed(2)}`;
}

export function listOffers(threadId: string): Offer[] {
  return read(threadId);
}

export function latestOffer(threadId: string): Offer | undefined {
  const arr = read(threadId);
  return arr.length ? arr[arr.length - 1] : undefined;
}

export function updateOfferStatus(
  threadId: string,
  offerId: string,
  status: Offer["status"]
): Offer | null {
  const arr = read(threadId);
  const idx = arr.findIndex((o) => o.id === offerId);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], status };
  write(threadId, arr);
  return arr[idx];
}

export function createOffer(input: Omit<Offer, "id" | "status"> & { amountCents: number }): Offer {
  const id = `offer_${Date.now()}`;
  const offer: Offer = {
    id,
    threadId: input.threadId,
    amountCents: input.amountCents,
    currency: input.currency ?? "GBP",
    status: "pending",
    starterId: input.starterId,
    recipientId: input.recipientId,
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    listingImage: input.listingImage,
    peerName: input.peerName,
  };
  const arr = read(input.threadId);
  arr.push(offer);
  write(input.threadId, arr);
  return offer;
}

export function resetAllOffers(): void {
  if (typeof window === "undefined") return;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("ms:offers")) localStorage.removeItem(k);
    }
    window.dispatchEvent(new CustomEvent("ms:offers", { detail: { reset: true } }));
  } catch {}
}
