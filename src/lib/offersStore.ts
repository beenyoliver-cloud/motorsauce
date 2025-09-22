// src/lib/offersStore.ts
export type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn";

export type Offer = {
  id: string;
  threadId: string;
  from: string; // "You" or other user display name
  peerName: string; // other party's display name
  amountCents: number;
  currency?: "GBP";
  listingId: string | number;
  listingTitle: string;
  listingImage?: string;
  status: OfferStatus;
  createdAt: number;
};
// src/lib/offersStore.ts (add this near other exports)
export function resetAllOffers(): void {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("ms:offers")) localStorage.removeItem(k);
    });
    window.dispatchEvent(new CustomEvent("ms:offers", { detail: { reset: true } }));
  } catch {}
}

const LS_OFFERS = "ms_offers_v1";
const LS_OFFER_TOAST_DISMISS = "ms_offer_toast_dismiss_v1";

function nsKey(k: string) {
  return `ms:${k}`;
}

function readJSON<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const v = localStorage.getItem(nsKey(k));
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
function writeJSON<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(nsKey(k), JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("ms:offers", { detail: {} }));
}

function cuid() {
  return `o_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function formatGBP(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "GBP" });
}

export function listOffers(threadId?: string): Offer[] {
  const all = readJSON<Offer[]>(LS_OFFERS, []);
  return threadId ? all.filter((o) => o.threadId === threadId) : all;
}

export function latestOffer(threadId: string): Offer | undefined {
  const list = listOffers(threadId).sort((a, b) => b.createdAt - a.createdAt);
  return list[0];
}

/** Create a brand-new pending offer */
export function createOffer(input: {
  threadId: string;
  from: string;       // "You" if created by current viewer
  peerName: string;   // other side's name
  amountCents: number;
  currency?: "GBP";
  listingId: string | number;
  listingTitle: string;
  listingImage?: string;
}): Offer {
  const all = readJSON<Offer[]>(LS_OFFERS, []);
  const offer: Offer = {
    id: cuid(),
    threadId: input.threadId,
    from: input.from,
    peerName: input.peerName,
    amountCents: input.amountCents,
    currency: input.currency ?? "GBP",
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    listingImage: input.listingImage,
    status: "pending",
    createdAt: Date.now(),
  };
  all.push(offer);
  writeJSON(LS_OFFERS, all);
  return offer;
}

/** Update status EXACTLY ONCE for a given offer id */
export function updateOfferStatus(threadId: string, offerId: string, status: OfferStatus): Offer | null {
  const all = readJSON<Offer[]>(LS_OFFERS, []);
  const idx = all.findIndex((o) => o.id === offerId && o.threadId === threadId);
  if (idx === -1) return null;

  const current = all[idx];
  if (current.status !== "pending") {
    // Already responded — do nothing
    return current;
  }
  const next = { ...current, status };
  all[idx] = next;
  writeJSON(LS_OFFERS, all);
  return next;
}

/** Toast helpers */
type ToastKey = { [threadId: string]: string[] }; // threadId -> dismissed offerIds
export function wasToastDismissed(threadId: string, offerId: string): boolean {
  const map = readJSON<ToastKey>(LS_OFFER_TOAST_DISMISS, {});
  return !!(map[threadId] && map[threadId].includes(offerId));
}
export function dismissToast(threadId: string, offerId: string) {
  const map = readJSON<ToastKey>(LS_OFFER_TOAST_DISMISS, {});
  const arr = map[threadId] || [];
  if (!arr.includes(offerId)) arr.push(offerId);
  map[threadId] = arr;
  writeJSON(LS_OFFER_TOAST_DISMISS, map);
}
