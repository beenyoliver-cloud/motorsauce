// src/app/api/messages/threads/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-only client (respects RLS with authenticated user context)
function getSupabase(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  
  return client;
}

type ThreadRow = {
  id: string;
  participant_1_id?: string; // new schema
  participant_2_id?: string; // new schema
  a_user?: string; // legacy schema
  b_user?: string; // legacy schema
  listing_ref?: string | null;
  last_message_text?: string | null;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  account_type?: string | null;
  business_verified?: boolean | null;
  total_sales?: number | null;
  avg_response_time_minutes?: number | null;
  response_rate?: number | null;
};

// GET /api/messages/threads - List all threads for the authenticated user
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch thread summaries (RLS will filter to only user's threads)
    const { data: threads, error: threadsError } = await supabase
      .from("thread_summaries")
      .select("id, participant_1_id, participant_2_id, listing_ref, last_message_preview, last_message_at, created_at, updated_at");

    if (threadsError) {
      console.error("[threads API] Error fetching threads:", threadsError);
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }

    if (!threads || threads.length === 0) {
      return NextResponse.json({ threads: [] }, { status: 200 });
    }

    // Defensive filter: in case legacy schema or missing RLS, remove threads the user soft-deleted
    // This complements RLS which already hides deleted threads in the new schema.
    const { data: deletions, error: deletionsError } = await supabase
      .from("thread_deletions")
      .select("thread_id")
      .eq("user_id", user.id);
    if (deletionsError) {
      console.warn("[threads API] Could not fetch deletions; proceeding without client-side filter", deletionsError);
    }
    const deletedIds = new Set((deletions || []).map((d: { thread_id: string }) => d.thread_id));
    const visibleThreads = (threads || []).filter((t: any) => !deletedIds.has(t.id));

    // Determine schema style (legacy vs new)
    const isLegacy = false; // summaries view only returns new columns

    // Enrich with peer profile data and read status
    const participantIds = new Set<string>();
    visibleThreads.forEach((t: ThreadRow) => {
      const p1 = t.participant_1_id!;
      const p2 = t.participant_2_id!;
      if (p1 !== user.id) participantIds.add(p1);
      if (p2 !== user.id) participantIds.add(p2);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, account_type, business_verified, total_sales, avg_response_time_minutes, response_rate")
      .in("id", Array.from(participantIds));

    const profileMap = new Map<string, ProfileRow>();
    (profiles || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    // Fetch listing data for threads that have listing_ref
    const listingRefs = visibleThreads
      .filter((t: ThreadRow) => t.listing_ref)
      .map((t: ThreadRow) => t.listing_ref!);
    
    let listingMap = new Map<string, any>();
    if (listingRefs.length > 0) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, price, condition, images, image_urls")
        .in("id", listingRefs);
      
      if (listings) {
        listingMap = new Map(listings.map((l: any) => [
          l.id,
          {
            id: l.id,
            title: l.title,
            image: (
              (Array.isArray(l.images) && l.images.length > 0 && (l.images[0]?.url || l.images[0])) ||
              (Array.isArray(l.image_urls) && l.image_urls.length > 0 ? l.image_urls[0] : null) ||
              null
            ),
            price: typeof l.price === "number" ? l.price : (l.price ?? null),
            condition: l.condition || null,
          }
        ]));
      }
    }

    // Fetch read status
    const { data: readStatus } = await supabase
      .from("thread_read_status")
      .select("thread_id")
      .eq("user_id", user.id);

    const readSet = new Set((readStatus || []).map((r: { thread_id: string }) => r.thread_id));

    const threadIds = visibleThreads.map((t: ThreadRow) => t.id);

    // Determine last message sender for "needs reply" with a bounded query
    const lastSenderMap = new Map<string, { from_user_id?: string | null; sender?: string | null; created_at?: string | null }>();
    if (threadIds.length > 0) {
      const limit = Math.max(threadIds.length * 3, 20); // cap scan size to avoid large payloads
      const { data: lastRows, error: lastErr } = await supabase
        .from("messages")
        .select("thread_id, from_user_id, sender, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!lastErr && lastRows) {
        for (const row of lastRows) {
          if (!lastSenderMap.has(row.thread_id)) lastSenderMap.set(row.thread_id, row);
        }
      } else if (lastErr) {
        console.warn("[threads API] Unable to fetch last message senders:", lastErr);
      }
    }

    // Fetch open offers for quick filtering
    type OfferMeta = {
      id: string;
      amount_cents: number;
      currency: string;
      status: string;
      starter_id: string;
      recipient_id: string;
      created_at: string | null;
    };
    const offerMap = new Map<string, OfferMeta>();
    if (threadIds.length > 0) {
      const { data: offerRows, error: offerError } = await supabase
        .from("offers")
        .select("id, thread_id, amount_cents, currency, status, starter_id, recipient_id, created_at")
        .in("thread_id", threadIds)
        .in("status", ["pending", "countered"])
        .order("created_at", { ascending: false });
      if (!offerError && offerRows) {
        offerRows.forEach((offer) => {
          const existing = offerMap.get(offer.thread_id);
          if (!existing) {
            offerMap.set(offer.thread_id, offer as OfferMeta);
            return;
          }
          const existingTs = existing.created_at ? Date.parse(existing.created_at) : 0;
          const currentTs = offer.created_at ? Date.parse(offer.created_at) : 0;
          if (currentTs > existingTs) {
            offerMap.set(offer.thread_id, offer as OfferMeta);
          }
        });
      } else if (offerError) {
        console.warn("[threads API] Unable to fetch offers:", offerError);
      }
    }

    // Build response
    const enriched = visibleThreads.map((t: ThreadRow) => {
      const p1 = t.participant_1_id!;
      const p2 = t.participant_2_id!;
      const peerId = p1 === user.id ? p2 : p1;
      const peer = profileMap.get(peerId);
      const listing = t.listing_ref ? listingMap.get(t.listing_ref) : null;
      const lastMeta = lastSenderMap.get(t.id);
      const lastSenderId = lastMeta?.from_user_id || lastMeta?.sender || null;
      const lastMessageFromSelf = lastSenderId ? lastSenderId === user.id : false;
      const openOffer = offerMap.get(t.id) || null;
      const needsReply = !readSet.has(t.id) && !lastMessageFromSelf;
      return {
        id: t.id,
        peer: {
          id: peerId,
          name: peer?.name || "Unknown",
          email: peer?.email,
          avatar: peer?.avatar,
          accountType: peer?.account_type || null,
          businessVerified: Boolean(peer?.business_verified),
          totalSales: peer?.total_sales || null,
          avgResponseMinutes: peer?.avg_response_time_minutes || null,
          responseRate: peer?.response_rate || null,
        },
        listingRef: t.listing_ref || null,
        listing: listing
          ? {
              ...listing,
              price: listing.price,
              condition: listing.condition,
            }
          : null,
        lastMessage: (t as any).last_message_preview || null,
        lastMessageAt: t.last_message_at || t.created_at || new Date().toISOString(),
        isRead: readSet.has(t.id),
        needsReply,
        lastMessageFromSelf,
        openOffer: openOffer
          ? {
              id: openOffer.id,
              status: openOffer.status,
              amountCents: openOffer.amount_cents,
              currency: openOffer.currency,
              fromSelf: openOffer.starter_id === user.id,
              needsResponse: openOffer.recipient_id === user.id && openOffer.status === "pending",
              createdAt: openOffer.created_at,
            }
          : null,
        createdAt: t.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({ threads: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages/threads - Create or get existing thread
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[threads API POST] No authorization header");
      return NextResponse.json({ error: "Unauthorized - No auth header" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[threads API POST] Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    console.log("[threads API POST] Authenticated user:", user.id);

    const body = await req.json();
    const { peerId, listingRef } = body;

    console.log("[threads API POST] Request body:", { peerId, listingRef });

    if (!peerId) {
      console.error("[threads API POST] Missing peerId");
      return NextResponse.json({ error: "peerId is required" }, { status: 400 });
    }

    if (peerId === user.id) {
      console.error("[threads API POST] User trying to message themselves");
      return NextResponse.json({ error: "Cannot create thread with yourself" }, { status: 400 });
    }

    // Participants ordered by UUID for consistency
    const [p1, p2] = [user.id, peerId].sort();
    console.log("[threads API POST] Creating thread with participants:", { p1, p2, listingRef });

    // Try to find existing thread first
    let threadQuery = supabase
      .from("threads")
      .select("*")
      .eq("participant_1_id", p1)
      .eq("participant_2_id", p2);
    
    if (listingRef) {
      threadQuery = threadQuery.eq("listing_ref", listingRef);
    } else {
      threadQuery = threadQuery.is("listing_ref", null);
    }

    const { data: existingThread, error: fetchError } = await threadQuery.single();

    let threadAttempt: any;
    if (existingThread) {
      console.log("[threads API POST] Found existing thread:", existingThread.id);
      threadAttempt = { data: existingThread, error: null };
    } else if (fetchError && fetchError.code === "PGRST116") {
      // No row found - this is expected, create a new thread
      console.log("[threads API POST] No existing thread found, creating new one");
      threadAttempt = await supabase
        .from("threads")
        .insert({
          participant_1_id: p1,
          participant_2_id: p2,
          listing_ref: listingRef || null,
          last_message_text: "New conversation",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
    } else if (fetchError && fetchError.code === "42703") {
      // Undefined column => legacy schema fallback
      console.warn("[threads API POST] Falling back to legacy schema (a_user/b_user)");
      
      // Try to find existing thread in legacy schema
      const { data: legacyThread, error: legacyFetchError } = await supabase
        .from("threads")
        .select("*")
        .eq("a_user", p1)
        .eq("b_user", p2)
        .single();

      if (legacyThread) {
        console.log("[threads API POST] Found existing legacy thread:", legacyThread.id);
        threadAttempt = { data: legacyThread, error: null };
      } else if (legacyFetchError && legacyFetchError.code === "PGRST116") {
        // Create new legacy thread
        threadAttempt = await supabase
          .from("threads")
          .insert({
            a_user: p1,
            b_user: p2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            listing_ref: listingRef || null,
          })
          .select()
          .single();
      } else {
        threadAttempt = { error: legacyFetchError };
      }
    } else {
      threadAttempt = { error: fetchError };
    }

    if (threadAttempt.error) {
      const upsertError = threadAttempt.error;
      console.error("[threads API POST] Error creating/fetching thread:", {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return NextResponse.json({
        error: `Failed to create thread: ${upsertError.message}`,
        details: upsertError.details,
        hint: upsertError.hint,
      }, { status: 500 });
    }

    const raw = threadAttempt.data as ThreadRow;
    const threadNormalized: ThreadRow = raw.participant_1_id
      ? raw
      : {
          id: raw.id,
          participant_1_id: (raw.a_user! < raw.b_user! ? raw.a_user : raw.b_user)!,
          participant_2_id: (raw.a_user! < raw.b_user! ? raw.b_user : raw.a_user)!,
          listing_ref: raw.listing_ref || null,
          last_message_text: raw.last_message_text || "New conversation",
          last_message_at: raw.last_message_at || raw.created_at || new Date().toISOString(),
          created_at: raw.created_at || new Date().toISOString(),
          updated_at: raw.updated_at || raw.created_at || new Date().toISOString(),
        } as ThreadRow;

    // Determine if this is a brand new thread (no messages yet)
    let isNew = false;
    const { count: messageCount, error: countError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", threadNormalized.id);
    if (!countError && (messageCount === 0 || messageCount === null)) {
      isNew = true;
    }

    // If the current user had previously soft-deleted this thread, "undelete" it by removing the deletion marker
    const { error: undeleteError } = await supabase
      .from("thread_deletions")
      .delete()
      .eq("thread_id", threadNormalized.id)
      .eq("user_id", user.id);
    if (undeleteError) {
      console.warn("[threads API POST] Failed to remove deletion marker for user", undeleteError);
    }

    if (isNew) {
      // Insert initial system message so UI can derive peer & show timeline (support legacy sender column)
      let systemInsert = await supabase
        .from("messages")
        .insert({
          thread_id: threadNormalized.id,
          from_user_id: user.id, // system message authored by creator for RLS compliance
          sender: user.id,
          message_type: "system",
          text_content: listingRef ? "Conversation started regarding listing" : "Conversation started",
        });
      if (systemInsert.error) {
        if (systemInsert.error.code === "42703") {
          // Legacy fallback (text_content may be 'text', sender column present)
          systemInsert = await supabase
            .from("messages")
            .insert({
              thread_id: threadNormalized.id,
              sender: user.id,
              message_type: "system",
              text: listingRef ? "Conversation started regarding listing" : "Conversation started",
            });
        }
        if (systemInsert.error) {
          console.warn("[threads API POST] Failed to create initial system message after fallback", systemInsert.error);
        }
      }
    }

    // If conversation is about a listing, add a system message with link/preview for clarity
    if (listingRef) {
      const listingUrl =
        (process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")) +
        `/listing/${encodeURIComponent(listingRef)}`;
      try {
        await supabase.from("messages").insert({
          thread_id: threadNormalized.id,
          from_user_id: user.id,
          sender: user.id,
          message_type: "system",
          text_content: `Listing link: ${listingUrl}`,
        });
      } catch (linkErr: any) {
        console.warn("[threads API POST] Failed to add listing link system message", linkErr?.message || linkErr);
      }
    }

    // Create read status entry for creator if not exists
    const { error: readStatusError } = await supabase
      .from("thread_read_status")
      .upsert({
        thread_id: threadNormalized.id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      }, { onConflict: "thread_id,user_id" });
    if (readStatusError) {
      console.warn("[threads API POST] Failed to upsert read status", readStatusError);
    }

    // Fetch peer profile for enrichment
    const derivedPeerId = threadNormalized.participant_1_id === user.id
      ? threadNormalized.participant_2_id
      : threadNormalized.participant_1_id;
    let peer: ProfileRow | null = null;
    const { data: peerProfile } = await supabase
      .from("profiles")
      .select("id, name, email, avatar")
  .eq("id", derivedPeerId)
      .single();
    if (peerProfile) peer = peerProfile as ProfileRow;

    console.log("[threads API POST] Thread created successfully (normalized):", threadNormalized, { isNew });
    return NextResponse.json({
      thread: threadNormalized,
      peer: peer ? { id: peer.id, name: peer.name, email: peer.email, avatar: peer.avatar } : null,
      isNew,
    }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
