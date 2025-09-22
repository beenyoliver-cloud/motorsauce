// src/lib/messages.ts
export type Message = {
  id: string;
  from: string;          // "You" or username
  to: string;            // peer username
  body?: string;
  ts: number;            // epoch ms
  kind: "text" | "offer";
  offer?: OfferPayload;  // when kind === "offer"
};

export type OfferPayload = {
  listingId: string;
  listingTitle: string;
  thumbnail?: string;
  currency: "GBP";
  price: number;          // offered
  originalPrice?: number; // seller's listing price
  status: "pending" | "accepted" | "declined" | "countered" | "expired" | "withdrawn";
  expiresAt?: number;     // epoch ms
  actor?: "buyer" | "seller";
};

export type Conversation = {
  peer: string;                // username
  lastMessage?: Message;
  unreadCount: number;
};

export async function fetchConversations(): Promise<Conversation[]> {
  const r = await fetch("/api/messages", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load conversations");
  return r.json();
}

export async function fetchThread(peer: string): Promise<Message[]> {
  const r = await fetch(`/api/messages/${encodeURIComponent(peer)}/thread`, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load thread");
  return r.json();
}

export async function sendText(peer: string, body: string): Promise<Message> {
  const r = await fetch(`/api/messages/${encodeURIComponent(peer)}/thread`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "text", body }),
  });
  if (!r.ok) throw new Error("Failed to send");
  return r.json();
}

export async function sendOffer(peer: string, offer: OfferPayload): Promise<Message> {
  const r = await fetch(`/api/messages/${encodeURIComponent(peer)}/offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(offer),
  });
  if (!r.ok) throw new Error("Failed to send offer");
  return r.json();
}

export async function actOnOffer(peer: string, offerMessageId: string, action: "accept" | "decline" | "counter", counterPrice?: number): Promise<Message> {
  const r = await fetch(`/api/messages/${encodeURIComponent(peer)}/offers/${encodeURIComponent(offerMessageId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, counterPrice }),
  });
  if (!r.ok) throw new Error("Failed to update offer");
  return r.json();
}
