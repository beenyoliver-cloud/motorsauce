// src/lib/messagesClient.ts
/**
 * Client-side API wrapper for the new persistent messaging system.
 * Replaces localStorage-based chatStore with server-persisted data.
 */

import { supabaseBrowser } from "./supabase";

export type Thread = {
  id: string;
  peer: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  listingRef?: string | null;
  listing?: {
    id: string;
    title: string;
    image?: string | null;
  } | null;
  lastMessage?: string | null;
  lastMessageAt: string;
  isRead: boolean;
  createdAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: "text" | "offer" | "system" | "review";
  text?: string;
  offer?: {
    id: string;
    listingId?: string;
    amountCents: number;
    currency: string;
    status: string;
    listingTitle?: string;
    listingImage?: string;
    listingPrice?: number;
  };
  review?: {
    id: string;
    rating: number;
    title?: string;
    text?: string;
    listingId?: string;
    listingTitle?: string;
    listingImage?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type Offer = {
  id: string;
  threadId: string;
  listingId: string;
  listingTitle?: string;
  listingImage?: string;
  starterId: string;
  recipientId: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// Helper to get auth header for API requests
async function getAuthHeader(): Promise<string | null> {
  const supabase = supabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

/**
 * Fetch all threads for the current user
 */
export async function fetchThreads(): Promise<Thread[]> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.warn("[messagesClient] Not authenticated");
      return [];
    }

    const res = await fetch("/api/messages/threads", {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      console.error("[messagesClient] Failed to fetch threads:", res.status);
      return [];
    }

    const data = await res.json();
    return data.threads || [];
  } catch (error) {
    console.error("[messagesClient] Error fetching threads:", error);
    return [];
  }
}

/**
 * Create or get existing thread with a peer
 */
export async function createThread(peerId: string, listingRef?: string): Promise<Thread | null> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.error("[messagesClient] No auth header available");
      alert("Not authenticated. Please log in and try again.");
      return null;
    }

    console.log("[messagesClient] Creating thread with peerId:", peerId, "listingRef:", listingRef);

    const res = await fetch("/api/messages/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ peerId, listingRef }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("[messagesClient] Failed to create thread:", res.status, errorData);
      
      // Show more specific error message to user
      const errorMsg = errorData.error || errorData.message || "Unknown error";
      alert(`Failed to start conversation: ${errorMsg}\n\nStatus: ${res.status}`);
      return null;
    }

    const data = await res.json();
    console.log("[messagesClient] Thread created successfully:", data.thread);
    return data.thread;
  } catch (error) {
    console.error("[messagesClient] Error creating thread:", error);
    alert(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return null;
  }
}

/**
 * Fetch all messages in a thread
 */
export async function fetchMessages(threadId: string): Promise<Message[]> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) return [];

    const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      console.error("[messagesClient] Failed to fetch messages:", res.status);
      return [];
    }

    const data = await res.json();
    return data.messages || [];
  } catch (error) {
    console.error("[messagesClient] Error fetching messages:", error);
    return [];
  }
}

/**
 * Send a text message to a thread
 */
export async function sendMessage(threadId: string, text: string): Promise<Message | null> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) return null;

    const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ type: "text", text }),
    });

    if (!res.ok) {
      let errorDetail: any = null;
      try { errorDetail = await res.json(); } catch {}
      const msg = errorDetail?.error || errorDetail?.message || `HTTP ${res.status}`;
      console.error("[messagesClient] Failed to send message:", res.status, msg);
      throw new Error(msg);
    }

    const data = await res.json();
    const raw = data.message;
    if (!raw) return null;

    // Enrich raw message row to Message shape expected by UI
    // We only know current sender (the user) so we can fetch their profile for name/avatar.
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      let name: string = "You";
      let avatar: string | undefined = undefined;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, avatar")
          .eq("id", userId)
          .single();
        if (profile) {
          name = profile.name || name;
          avatar = profile.avatar || undefined;
        }
      }
      const enriched: Message = {
        id: raw.id,
        threadId: raw.thread_id,
        from: { id: userId || "", name, avatar },
        type: raw.message_type,
        text: raw.text_content,
        offer: raw.message_type === "offer" ? {
          id: raw.offer_id,
          amountCents: raw.offer_amount_cents,
          currency: raw.offer_currency,
          status: raw.offer_status,
        } : undefined,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      };
      
      // Trigger unread count update in header
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ms:unread"));
      }
      
      return enriched;
    } catch (enrichErr) {
      console.warn("[messagesClient] Failed to enrich sent message, falling back to raw", enrichErr);
      return {
        id: raw.id,
        threadId: raw.thread_id,
        from: { id: raw.from_user_id, name: "You" },
        type: raw.message_type,
        text: raw.text_content,
        offer: undefined,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      };
    }
  } catch (error) {
    console.error("[messagesClient] Error sending message:", error);
    throw error; // propagate so UI can surface
  }
}

/**
 * Mark a thread as read
 */
export async function markThreadRead(threadId: string): Promise<boolean> {
  try {
    console.log("[messagesClient] Marking thread as read:", threadId);
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.warn("[messagesClient] No auth header, cannot mark thread read");
      return false;
    }

    const res = await fetch("/api/messages/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ threadId }),
    });

    if (res.ok) {
      console.log("[messagesClient] Thread marked as read successfully");
      // Dispatch event to trigger header badge update
      window.dispatchEvent(new Event("ms:unread"));
    } else {
      console.error("[messagesClient] Failed to mark thread read:", res.status, await res.text());
    }

    return res.ok;
  } catch (error) {
    console.error("[messagesClient] Error marking thread read:", error);
    return false;
  }
}

/**
 * Mark a thread as unread (eBay-style)
 */
export async function markThreadUnread(threadId: string): Promise<boolean> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) return false;

    const res = await fetch("/api/messages/read", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ threadId }),
    });

    return res.ok;
  } catch (error) {
    console.error("[messagesClient] Error marking thread unread:", error);
    return false;
  }
}

/**
 * Soft-delete a thread (only hides for current user)
 */
export async function deleteThread(threadId: string): Promise<boolean> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) return false;

    const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      try {
        const data = await res.json();
        console.error("[messagesClient] Delete failed:", data);
      } catch (e) {
        console.error("[messagesClient] Delete failed with status", res.status);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("[messagesClient] Error deleting thread:", error);
    return false;
  }
}

/**
 * Create a new offer
 */
export async function createOffer(params: {
  threadId: string;
  listingId: string;
  listingTitle?: string;
  listingImage?: string;
  recipientId: string;
  amountCents: number;
  currency?: string;
}): Promise<Offer | null> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.error("[messagesClient] No auth header for createOffer");
      return null;
    }

    console.log("[messagesClient] Creating offer with params:", params);

    const res = await fetch("/api/offers/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[messagesClient] Failed to create offer:", {
        status: res.status,
        error: errorData
      });
      throw new Error(errorData.error || `Failed to create offer (${res.status})`);
    }

    const data = await res.json();
    console.log("[messagesClient] Offer created successfully:", data.offer);
    return data.offer;
  } catch (error) {
    console.error("[messagesClient] Error creating offer:", error);
    throw error;
  }
}

/**
 * Update offer status (accept, decline, counter, withdraw)
 */
export async function updateOfferStatus(
  offerId: string,
  status: string,
  counterAmountCents?: number
): Promise<Offer | null> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      console.error("[messagesClient] No auth header available");
      return null;
    }

    console.log("[messagesClient] Calling /api/offers/new PATCH with:", { offerId, status, counterAmountCents });

    const res = await fetch("/api/offers/new", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ offerId, status, counterAmountCents }),
    });

    console.log("[messagesClient] Response status:", res.status);

    if (!res.ok) {
      console.error("[messagesClient] Failed to update offer, status:", res.status);
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          console.error("[messagesClient] Error response body:", errorData);
          errorMessage = errorData.error || errorMessage;
        } else {
          const text = await res.text();
          console.error("[messagesClient] Error response text:", text);
          if (text.includes('Body is disturbed or locked')) {
            errorMessage = "Request conflict - please try again";
          }
        }
      } catch (parseErr) {
        console.error("[messagesClient] Failed to parse error response:", parseErr);
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log("[messagesClient] Update offer success, response:", data);
    return data.offer;
  } catch (error) {
    console.error("[messagesClient] Error updating offer:", error);
    throw error;
  }
}

/**
 * Fetch offers for a thread
 */
export async function fetchOffers(threadId?: string): Promise<Offer[]> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) return [];

    const url = threadId
      ? `/api/offers/new?threadId=${encodeURIComponent(threadId)}`
      : "/api/offers/new";

    const res = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      console.error("[messagesClient] Failed to fetch offers:", res.status);
      return [];
    }

    const data = await res.json();
    return data.offers || [];
  } catch (error) {
    console.error("[messagesClient] Error fetching offers:", error);
    return [];
  }
}
