// src/app/api/_lib/mem.ts

export type OfferPayload = {
  listingId: string;
  listingTitle: string;
  listingPrice?: number;
  amount: number;
  currency: string; // e.g. "GBP"
  status: "proposed" | "accepted" | "declined" | "counter" | "expired" | "withdrawn";
  expiresAt?: string;
  actorId: string;
};

export type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  type: "text" | "offer";
  body?: string;
  offer?: OfferPayload;
};

export type Peer = {
  id: string;
  name: string;
  avatar?: string;
  lastSnippet?: string;
  lastMessageAt?: string;
};

type Store = {
  messagesByPeer: Record<string, Message[]>;
  peers: Record<string, Peer>;
};

// Augment global to avoid any
declare global {
  // eslint-disable-next-line no-var
  var __msStore: Store | undefined;
}

if (!globalThis.__msStore) {
  globalThis.__msStore = { messagesByPeer: {}, peers: {} };
}
export const store: Store = globalThis.__msStore;

export function upsertPeer(id: string, name?: string) {
  if (!store.peers[id]) {
    store.peers[id] = { id, name: name || id };
  } else if (name && store.peers[id].name !== name) {
    store.peers[id].name = name;
  }
  return store.peers[id];
}

export function addMessage(peerId: string, msg: Message) {
  const arr = store.messagesByPeer[peerId] || [];
  store.messagesByPeer[peerId] = [...arr, msg];

  const snippet = msg.type === "text" ? (msg.body || "") : "Offer";
  const when = msg.createdAt;
  const p = upsertPeer(peerId);
  p.lastSnippet = snippet;
  p.lastMessageAt = when;
}

export function findMessageById(messageId: string): { peerId: string; index: number; message: Message } | null {
  for (const peerId of Object.keys(store.messagesByPeer)) {
    const list = store.messagesByPeer[peerId];
    const index = list.findIndex((m) => m.id === messageId);
    if (index >= 0) return { peerId, index, message: list[index] };
  }
  return null;
}
