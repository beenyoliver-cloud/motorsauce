// src/app/api/messages/[threadId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeMessageSafety } from "@/lib/messagingSafety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

// GET /api/messages/[threadId] - Fetch all messages in a thread
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!threadId || !uuidRegex.test(threadId)) {
      return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
    }
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this conversation (bridge to new schema)
    // Primary lookup against conversations (RLS-protected)
    let { data: conversation, error: convError, status: convStatus } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id, listing_id, type")
      .eq("id", threadId)
      .single();

    // If RLS or a transient error blocks the base table lookup, fall back to the summaries view (manually enforcing access)
    if ((!conversation || convError) && convStatus !== 406) {
      const { data: convoView, error: viewErr } = await supabase
        .from("conversation_summaries")
        .select("id, buyer_user_id, seller_user_id, listing_id, type")
        .eq("id", threadId)
        .maybeSingle();

      if (convoView && !viewErr) {
        conversation = convoView as any;
        convError = null;
      }
    }

    if (convError && convStatus === 406) {
      // No rows found; surface threadMissing specifically
      return NextResponse.json({ error: "Thread not found", threadMissing: true, messages: [] }, { status: 200 });
    }

    if (convError) {
      console.error("[messages POST] Conversation lookup error:", {
        code: convError?.code,
        message: convError?.message,
        details: convError?.details,
      });
      return NextResponse.json({ error: convError.message || "Conversation lookup failed" }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ error: "Thread not found", threadMissing: true, messages: [] }, { status: 200 });
    }

    if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[messages POST] Conversation found:", conversation);
    const { searchParams } = new URL(req.url);
    // Fetch newest-first to avoid dropping recent messages when a thread has more than the default page size.
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);
    const before = searchParams.get("before");

    // Fetch messages from new schema
    let query = supabase
      .from("messages_v2")
      .select("*")
      .eq("conversation_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) {
      query = query.lt("created_at", before);
    }
    const { data: messageRows, error: messagesError } = await query;

    if (messagesError) {
      console.error("[messages API] Error fetching messages:", messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Fetch profiles for message senders (new schema uses sender_user_id)
    const orderedMessages = (messageRows || []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const senderIds = [...new Set(orderedMessages.map((m: any) => m.sender_user_id).filter(Boolean))];
    let profileMap = new Map();
    if (senderIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar")
        .in("id", senderIds);
      if (profileError) {
        console.warn("[messages API] Error fetching profiles:", profileError);
      } else {
        profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }
    }

    // Fetch offers from metadata
    const offerIds = orderedMessages
      .filter((m: any) => m.metadata?.offer_id)
      .map((m: any) => m.metadata.offer_id);
    
    let offerMap = new Map();
    let listingsMap = new Map();
    
    if (offerIds.length > 0) {
      // Fetch offers
      const { data: offers, error: offersError } = await supabase
        .from("offers")
        .select("id, listing_id, listing_title, listing_image, amount_cents, currency, status, starter_id, recipient_id, starter, recipient, buyer_id, seller_id")
        .in("id", offerIds);
      
      if (offersError) {
        console.error("[messages API] Error fetching offers:", offersError);
      }
      
      offerMap = new Map((offers || []).map((o: any) => [o.id, o]));
      
      // Get unique listing IDs and fetch their details
      const listingIds = Array.from(new Set((offers || []).map((o: any) => o.listing_id).filter(Boolean)));
      if (listingIds.length > 0) {
        const { data: listings, error: listingsError } = await supabase
          .from("listings")
          .select("id, title, price, images")
          .in("id", listingIds);
        
        if (listingsError) {
          console.error("[messages API] Error fetching listings:", listingsError);
        }
        
        listingsMap = new Map((listings || []).map((l: any) => [l.id, l]));
        // no-op
      }
    }

    // Enrich messages (map new schema to old format expected by UI)
    const enriched = orderedMessages.map((m: any) => {
      const senderId = m.sender_user_id;
      const sender = profileMap.get(senderId);
      const offerId = m.metadata?.offer_id;
      const offer = offerId ? offerMap.get(offerId) : null;
      const listing = offer?.listing_id ? listingsMap.get(offer.listing_id) : null;
      const normalizedType = m.type === "OFFER_CARD" ? "offer" : (m.type === "SYSTEM" ? "system" : "text");
      
      return {
        id: m.id,
        threadId: m.conversation_id, // map conversation_id to threadId for old UI
        from: {
          id: senderId || "",
          name: sender?.name || "System",
          avatar: sender?.avatar,
        },
        type: normalizedType,
        text: m.body,
        offer: m.type === "OFFER_CARD" && offer ? {
          id: offer.id,
          listingId: offer.listing_id || "",
          amountCents: offer.offered_amount ? Math.round(Number(offer.offered_amount) * 100) : 0,
          currency: offer.currency || "GBP",
          status: offer.status || "pending",
          listingTitle: listing?.title || offer?.listing_title || null,
          listingImage: (
            listing?.images && Array.isArray(listing.images) && listing.images.length > 0
              ? (listing.images[0]?.url || listing.images[0])
              : (offer?.listing_image || null)
          ),
          listingPrice: listing?.price ? Math.round(Number(listing.price) * 100) : undefined,
        } : undefined,
        createdAt: m.created_at,
        updatedAt: m.updated_at || m.created_at,
      };
    });

    return NextResponse.json({ messages: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("[messages API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages/[threadId] - Send a message to a thread
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId: initialThreadId } = await params;
    let threadId = initialThreadId;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!threadId || !uuidRegex.test(threadId)) {
      return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
    }
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type = "text",
      text,
      offerId,
      offerAmountCents,
      offerCurrency,
      offerStatus,
      peerId,
      listingRef: listingRefRaw,
    } = body;

    const listingRef =
      listingRefRaw &&
      `${listingRefRaw}`.trim().length > 0 &&
      `${listingRefRaw}` !== "null" &&
      `${listingRefRaw}` !== "undefined" &&
      uuidRegex.test(`${listingRefRaw}`.trim())
        ? `${listingRefRaw}`.trim()
        : null;

    if (!["text", "offer", "system"].includes(type)) {
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }

    if (type === "text" && !text?.trim()) {
      return NextResponse.json({ error: "Text is required for text messages" }, { status: 400 });
    }

    if (type === "text" && text) {
      const safety = analyzeMessageSafety(text);
      if (text.length > 2000) {
        return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
      }
      if (safety.blockReason) {
        return NextResponse.json(
          { error: safety.blockReason, code: "MESSAGE_BLOCKED" },
          { status: 400 }
        );
      }
    }

    if (type === "offer" && (!offerId || !offerAmountCents)) {
      return NextResponse.json({ error: "Offer details required for offer messages" }, { status: 400 });
    }

    // Verify conversation access (use new schema)
    console.log("[messages POST] Looking for conversation:", threadId, "for user:", user.id);
    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id, listing_id")
      .eq("id", threadId)
      .single();

    if (convError) {
      console.error("[messages POST] Conversation lookup error:", {
        code: convError.code,
        message: convError.message,
        details: convError.details,
      });
    }
    console.log("[messages POST] Conversation found:", conversation);

    if (convError || !conversation) {
      console.error("[messages POST] Conversation not found for threadId:", threadId);
      // Try to recreate if we have peerId/listingRef
      if (peerId && peerId !== user.id && listingRef) {
        // Fetch listing to get seller
        const { data: listing } = await supabase
          .from("listings")
          .select("seller_id")
          .eq("id", listingRef)
          .single();
        
        if (listing) {
          const buyerUserId = listing.seller_id === user.id ? peerId : user.id;
          const sellerUserId = listing.seller_id === user.id ? user.id : listing.seller_id;
          
          const recreated = await supabase
            .from("conversations")
            .insert({
              listing_id: listingRef,
              buyer_user_id: buyerUserId,
              seller_user_id: sellerUserId,
              status: "ACTIVE",
            })
            .select()
            .single();

          if (recreated.error || !recreated.data) {
            console.error("[messages POST] Conversation recreation failed", recreated.error);
            return NextResponse.json({ error: "Thread missing", threadMissing: true }, { status: 200 });
          }

          conversation = recreated.data;
          threadId = recreated.data.id;
        }
      }
      
      if (!conversation) {
        return NextResponse.json({ error: "Thread missing", threadMissing: true }, { status: 200 });
      }
    }
    
    // At this point, conversation is guaranteed to be non-null
    if (!conversation) {
      return NextResponse.json({ error: "Thread not found. Please reopen the conversation from Messages." }, { status: 404 });
    }
    
    if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert message into new schema
    const insert = await supabase
      .from("messages_v2")
      .insert({
        conversation_id: threadId,
        sender_user_id: user.id,
        type: type.toUpperCase(),
        body: type === "system" || type === "text" ? text : null,
        metadata: type === "offer" ? {
          offer_id: offerId,
          amount_cents: offerAmountCents,
          currency: offerCurrency || "GBP",
          status: offerStatus,
        } : {},
      })
      .select()
      .single();

    if (insert.error) {
      console.error("[messages API] Insert error:", insert.error);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }
    const message = insert.data;

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("[messages API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/messages/[threadId] - Soft-delete thread for current user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id")
      .eq("id", threadId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Thread not found", threadMissing: true }, { status: 200 });
    }

    if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft archive the conversation for now
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ status: "ARCHIVED" })
      .eq("id", threadId);

    if (updateError) {
      console.error("[messages API] Delete error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[messages API] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
