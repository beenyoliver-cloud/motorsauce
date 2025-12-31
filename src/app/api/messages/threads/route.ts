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

// GET /api/messages/threads - List all conversations for the authenticated user (bridge to new schema)
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

    // conversation_summaries view reads conversations/messages_v2 and respects RLS on conversations
    const { data: conversations, error: convError } = await supabase
      .from("conversation_summaries")
      .select("id, type, listing_id, buyer_user_id, seller_user_id, status, last_message_at, buyer_last_read_at, seller_last_read_at, created_at, updated_at, last_message_preview")
      .order("last_message_at", { ascending: false });

    if (convError) {
      console.error("[threads API] Error fetching conversations:", convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    const visible = (conversations || []).filter((c) => c.buyer_user_id === user.id || c.seller_user_id === user.id);
    if (visible.length === 0) {
      return NextResponse.json({ threads: [] }, { status: 200 });
    }

    // Peer profiles
    const peerIds = Array.from(new Set(visible.map((c) => (c.buyer_user_id === user.id ? c.seller_user_id : c.buyer_user_id))));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, account_type, business_verified, total_sales, avg_response_time_minutes, response_rate")
      .in("id", peerIds);
    const profileMap = new Map<string, ProfileRow>();
    (profiles || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    // Listing metadata
    const listingIds = Array.from(new Set(visible.map((c) => c.listing_id).filter(Boolean)));
    let listingMap = new Map<string, any>();
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, price, condition, images, image_urls")
        .in("id", listingIds);
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

    // Last message sender for needs-reply calculation
    const conversationIds = visible.map((c) => c.id);
    const lastSenderMap = new Map<string, string | null>();
    if (conversationIds.length > 0) {
      const limit = Math.max(conversationIds.length * 3, 20);
      const { data: lastRows, error: lastErr } = await supabase
        .from("messages_v2")
        .select("conversation_id, sender_user_id, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!lastErr && lastRows) {
        for (const row of lastRows) {
          if (!lastSenderMap.has(row.conversation_id)) {
            lastSenderMap.set(row.conversation_id, row.sender_user_id);
          }
        }
      } else if (lastErr) {
        console.warn("[threads API] Unable to fetch last message senders:", lastErr);
      }
    }

    const enriched = visible.map((c: any) => {
      const peerId = c.buyer_user_id === user.id ? c.seller_user_id : c.buyer_user_id;
      const peer = profileMap.get(peerId);
      const listing = c.listing_id ? listingMap.get(c.listing_id) : null;
      const lastMessageAt = c.last_message_at || c.updated_at || c.created_at || new Date().toISOString();
      const lastRead = c.buyer_user_id === user.id ? c.buyer_last_read_at : c.seller_last_read_at;
      const isRead = lastRead ? new Date(lastRead).getTime() >= new Date(lastMessageAt).getTime() : false;
      const lastSenderId = lastSenderMap.get(c.id) || null;
      const lastMessageFromSelf = lastSenderId ? lastSenderId === user.id : false;
      const needsReply = !isRead && !lastMessageFromSelf;

      return {
        id: c.id,
        type: c.type,
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
        listingRef: c.listing_id || null,
        listing: listing
          ? {
              ...listing,
              price: listing.price,
              condition: listing.condition,
            }
          : null,
        lastMessage: c.last_message_preview || null,
        lastMessageAt,
        isRead,
        needsReply,
        lastMessageFromSelf,
        openOffer: null,
        createdAt: c.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({ threads: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages/threads - Create or get existing conversation (bridge to new schema)
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

    const body = await req.json();
    const { peerId: peerIdRaw } = body;
    const peerId = typeof peerIdRaw === "string" ? peerIdRaw.trim() : "";
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!peerId || !uuidRegex.test(peerId)) {
      console.error("[threads API POST] Invalid peerId:", peerIdRaw);
      return NextResponse.json({ error: "Valid peerId is required" }, { status: 400 });
    }

    const listingRefRaw = body?.listingRef;
    const listingRef =
      listingRefRaw && `${listingRefRaw}`.trim().length > 0 && `${listingRefRaw}` !== "null" && `${listingRefRaw}` !== "undefined"
        ? `${listingRefRaw}`.trim()
        : null;
    const hasListing = Boolean(listingRef && uuidRegex.test(listingRef));
    const conversationType = hasListing ? "LISTING" : "DIRECT";

    if (peerId === user.id) {
      console.error("[threads API POST] User trying to message themselves");
      return NextResponse.json({ error: "Cannot create thread with yourself" }, { status: 400 });
    }

    let sellerId: string | null = null;
    let buyerId: string | null = null;
    let context: any = null;

    if (hasListing) {
      // Fetch listing to determine roles
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .select("id, seller_id, title, price, images")
        .eq("id", listingRef)
        .single();

      if (listingError || !listing) {
        console.error("[threads API POST] Listing lookup failed", listingError);
        return NextResponse.json({ error: "Thread not found for this peer", threadMissing: true }, { status: 200 });
      }

      sellerId = listing.seller_id;
      const isSeller = sellerId === user.id;
      buyerId = isSeller ? peerId : user.id;

      if (!isSeller && peerId !== sellerId) {
        console.error("[threads API POST] peerId must be the listing seller for buyers", { peerId, sellerId });
        return NextResponse.json({ error: "Conversation must be with the listing seller" }, { status: 400 });
      }

      context = {
        listing_title: listing.title,
        listing_price: listing.price,
        listing_image: Array.isArray(listing.images) && listing.images.length > 0 ? (listing.images[0]?.url || listing.images[0]) : null,
      };
    } else {
      // Listing-less conversation: treat initiator as buyer and peer as seller for consistent roles
      buyerId = user.id;
      sellerId = peerId;
    }

    // Find existing conversation
    let existingConv = null;
    let convFetchError = null;

    if (hasListing) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("listing_id", listingRef)
        .eq("buyer_user_id", buyerId)
        .eq("seller_user_id", sellerId)
        .eq("type", "LISTING")
        .maybeSingle();
      existingConv = data;
      convFetchError = error;
    } else {
      // listing-less: find by participant pair, listing_id is null
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .is("listing_id", null)
        .or(
          `and(buyer_user_id.eq.${buyerId},seller_user_id.eq.${sellerId}),and(buyer_user_id.eq.${sellerId},seller_user_id.eq.${buyerId})`
        )
        .eq("type", "DIRECT")
        .limit(1)
        .maybeSingle();
      existingConv = data;
      convFetchError = error;
    }

    if (convFetchError && convFetchError.code !== "PGRST116") {
      console.error("[threads API POST] Fetch conversation error", convFetchError);
      return NextResponse.json({ error: convFetchError.message }, { status: 500 });
    }

    let conversation = existingConv;
    let isNew = false;

    if (!conversation) {
      const { data: inserted, error: insertError } = await supabase
        .from("conversations")
        .insert({
          type: conversationType,
          listing_id: hasListing ? listingRef : null,
          buyer_user_id: buyerId,
          seller_user_id: sellerId,
          status: "ACTIVE",
          context,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error("[threads API POST] Insert conversation failed", insertError);
        return NextResponse.json({ error: insertError?.message || "Failed to create conversation" }, { status: 500 });
      }
      conversation = inserted;
      isNew = true;
    }

    // Fetch peer profile for enrichment
    const peerProfileId = buyerId === user.id ? sellerId : buyerId;
    let peer: ProfileRow | null = null;
    const { data: peerProfile } = await supabase
      .from("profiles")
      .select("id, name, email, avatar")
      .eq("id", peerProfileId)
      .single();
    if (peerProfile) peer = peerProfile as ProfileRow;

    console.log("[threads API POST] Conversation ready:", conversation.id, { isNew });

    return NextResponse.json({
      thread: {
        id: conversation.id,
        type: conversation.type,
        participant_1_id: conversation.buyer_user_id,
        participant_2_id: conversation.seller_user_id,
        listing_ref: conversation.listing_id,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      },
      peer: peer ? { id: peer.id, name: peer.name, email: peer.email, avatar: peer.avatar } : null,
      isNew,
    }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
