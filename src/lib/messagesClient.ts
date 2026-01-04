import { supabaseBrowser } from "@/lib/supabase";

export type Thread = {
  id: string;
  type: "LISTING" | "DIRECT";
  peer?: {
    id: string;
    name?: string;
    avatar?: string | null;
    email?: string | null;
    accountType?: string | null;
    businessVerified?: boolean;
  } | null;
  listingRef?: string | null;
  listing?: {
    id: string;
    title?: string | null;
    image?: string | null;
    price?: number | null;
    condition?: string | null;
  } | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  isRead?: boolean;
  needsReply?: boolean;
  createdAt?: string | null;
};

export type Message = {
  id: string;
  threadId: string;
  from: {
    id: string;
    name?: string;
    avatar?: string | null;
  };
  type: "text" | "offer" | "system";
  text?: string | null;
  offer?: Offer;
  createdAt: string;
  updatedAt?: string;
};

export type Offer = {
  id: string;
  threadId: string;
  listingId: string;
  listingTitle?: string | null;
  listingImage?: string | null;
  starterId: string;
  recipientId: string;
  buyerId?: string | null;
  sellerId?: string | null;
  amountCents: number;
  currency: string;
  status: "pending" | "accepted" | "declined" | "rejected" | "countered" | "withdrawn" | "expired";
  createdAt: string;
  updatedAt: string;
  expires_at?: string | null;
  quantity?: number;
};

const DB_TO_CLIENT_STATUS: Record<string, Offer["status"]> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "declined",
  COUNTERED: "countered",
  CANCELLED: "withdrawn",
  EXPIRED: "expired",
};

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

async function getAuthHeader(): Promise<string | null> {
  const supabase = supabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

function mapOffer(raw: any): Offer {
  return {
    id: raw.id,
    threadId: raw.threadId || raw.conversation_id || raw.thread_id || raw.conversationId || raw.conversationid || raw.conversation_id,
    listingId: raw.listingId || raw.listing_id,
    listingTitle: raw.listingTitle || raw.listing_title || null,
    listingImage: raw.listingImage || raw.listing_image || null,
    starterId: raw.starterId || raw.created_by_user_id || raw.starter,
    recipientId: raw.recipientId || raw.offered_to_user_id || raw.recipient,
    buyerId: raw.buyerId ?? raw.buyer_id ?? null,
    sellerId: raw.sellerId ?? raw.seller_id ?? null,
    amountCents: typeof raw.amount === "number" ? raw.amount : typeof raw.amount_cents === "number" ? raw.amount_cents : Number(raw.amount || 0),
    currency: raw.currency || "GBP",
    status: DB_TO_CLIENT_STATUS[raw.status] || (raw.status?.toLowerCase?.() as Offer["status"]) || "pending",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || raw.created_at || new Date().toISOString(),
    expires_at: raw.expires_at || null,
    quantity: raw.quantity ?? 1,
  };
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  if (!authHeader) throw new Error("Not authenticated");
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(opts.headers || {}),
    },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const msg = (payload as any)?.error || res.statusText || "Request failed";
    const err = new Error(msg);
    (err as any).code = (payload as any)?.code || res.status;
    throw err;
  }
  return payload as T;
}

export async function createThread(peerId: string, listingRef?: string | null) {
  const body: any = {};
  
  if (listingRef && uuidRegex.test(listingRef)) {
    // LISTING conversation
    body.listingId = listingRef;
  } else if (peerId && uuidRegex.test(peerId)) {
    // DIRECT conversation
    body.peerId = peerId;
  } else {
    throw new Error("Valid peerId or listingRef is required");
  }
  
  const data = await apiFetch<{ conversation: any; isNew?: boolean }>("/api/v2/conversations", {
    method: "POST",
    body: JSON.stringify(body),
  });
  
  // Map v2 response to legacy format for compatibility
  return {
    thread: data.conversation,
    threadId: data.conversation?.id,
    isNew: data.isNew,
  };
}

export async function fetchThreads(): Promise<Thread[]> {
  const data = await apiFetch<{ conversations: any[] }>("/api/v2/conversations");
  return (data.conversations || []).map((c) => ({
    id: c.id,
    type: c.type,
    peer: c.peer,
    listingRef: c.listing_id,
    listing: c.listing || null,
    lastMessage: c.last_message_preview || null,
    lastMessageAt: c.last_message_at || null,
    isRead: !c.is_unread,
    needsReply: false,
    createdAt: c.created_at || null,
  }));
}

export async function fetchMessages(threadId: string): Promise<Message[]> {
  if (!uuidRegex.test(threadId)) throw new Error("Invalid threadId");
  const data = await apiFetch<{ messages: any[] }>(`/api/v2/conversations/${encodeURIComponent(threadId)}/messages`);
  return (data.messages || []).map((m) => {
    const message: Message = {
      id: m.id,
      threadId: m.conversation_id || threadId,
      from: m.sender || { id: m.sender_user_id || "", name: m.sender?.name, avatar: m.sender?.avatar },
      type: m.type === "OFFER_CARD" ? "offer" : (m.type === "SYSTEM" ? "system" : "text"),
      text: m.body || null,
      createdAt: m.created_at || new Date().toISOString(),
      updatedAt: m.edited_at || m.created_at,
    };
    
    // Add offer data for OFFER_CARD messages
    if (m.type === "OFFER_CARD" && m.metadata?.offer_id) {
      message.offer = mapOffer({
        id: m.metadata.offer_id,
        threadId: m.metadata.threadId || threadId,
        conversation_id: m.metadata.threadId || threadId,
        listingId: m.metadata.listing_id,
        listing_id: m.metadata.listing_id,
        listingTitle: m.metadata.listing_title,
        listing_title: m.metadata.listing_title,
        listingImage: m.metadata.listing_image,
        listing_image: m.metadata.listing_image,
        starterId: m.metadata.created_by_user_id,
        created_by_user_id: m.metadata.created_by_user_id,
        recipientId: m.metadata.offered_to_user_id,
        offered_to_user_id: m.metadata.offered_to_user_id,
        amount: m.metadata.amount,
        currency: m.metadata.currency,
        status: m.metadata.status,
        created_at: m.metadata.created_at,
        updated_at: m.metadata.updated_at,
        quantity: m.metadata.quantity,
      });
    }
    
    return message;
  });
}

export async function sendMessage(threadId: string, text: string, opts?: { type?: "text" | "system" }) {
  if (!uuidRegex.test(threadId)) throw new Error("Invalid threadId");
  const payload = {
    type: opts?.type === "system" ? "SYSTEM" : "TEXT",
    text,
  };
  const data = await apiFetch<{ message: any }>(`/api/v2/conversations/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.message;
}

export async function markThreadRead(threadId: string): Promise<boolean> {
  // v2: Read status is automatically updated when fetching messages
  // No separate endpoint needed, but keep function for compatibility
  console.log("[messagesClient] markThreadRead - auto-updated by v2 GET messages");
  return true;
}

export async function markThreadUnread(threadId: string): Promise<boolean> {
  // v2: Not yet implemented in API
  console.warn("[messagesClient] markThreadUnread - not implemented in v2");
  return false;
}

export async function deleteThread(threadId: string): Promise<boolean> {
  // v2: Archive conversation instead of delete
  if (!uuidRegex.test(threadId)) throw new Error("Invalid threadId");
  console.warn("[messagesClient] deleteThread - not implemented in v2, consider PATCH status to ARCHIVED");
  return false;
}

export async function createOffer(params: { threadId: string; amountCents: number; currency?: string }) {
  if (!uuidRegex.test(params.threadId)) throw new Error("Invalid threadId");
  const data = await apiFetch<{ offer: any }>(`/api/offers/new`, {
    method: "POST",
    body: JSON.stringify({
      threadId: params.threadId,
      amountCents: params.amountCents,
      currency: params.currency || "GBP",
    }),
  });
  return mapOffer(data.offer);
}

export async function updateOfferStatus(offerId: string, status: string, counterAmountCents?: number) {
  const data = await apiFetch<{ offer: any }>(`/api/offers/new`, {
    method: "PATCH",
    body: JSON.stringify({
      offerId,
      status,
      counterAmountCents,
    }),
  });
  return mapOffer(data.offer);
}

export async function fetchOffers(threadId?: string): Promise<Offer[]> {
  const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
  const data = await apiFetch<{ offers: any[] }>(`/api/offers/new${qs}`);
  return (data.offers || []).map(mapOffer);
}
