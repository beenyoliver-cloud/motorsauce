// src/app/api/v2/conversations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabase(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

// POST /api/v2/conversations - Create or get existing conversation
export async function POST(req: Request) {
  try {
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
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    // Fetch listing to determine seller
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, seller_id, title, price, status")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing is not available" }, { status: 400 });
    }

    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: "Cannot start conversation with yourself" }, { status: 400 });
    }

    const buyerUserId = user.id;
    const sellerUserId = listing.seller_id;

    // Check if conversation already exists
    const { data: existing, error: existingError } = await supabase
      .from("conversations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_user_id", buyerUserId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[conversations] Error checking existing:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ conversation: existing, isNew: false }, { status: 200 });
    }

    // Create new conversation
    const context = {
      listing_title: listing.title,
      listing_price: listing.price,
      created_at: new Date().toISOString(),
    };

    const { data: conversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_user_id: buyerUserId,
        seller_user_id: sellerUserId,
        status: "ACTIVE",
        context,
      })
      .select()
      .single();

    if (createError) {
      console.error("[conversations] Create error:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Create initial system message
    const { error: messageError } = await supabase
      .from("messages_v2")
      .insert({
        conversation_id: conversation.id,
        sender_user_id: null, // system message
        type: "SYSTEM",
        body: `Conversation started about ${listing.title}`,
        metadata: { listing_id: listingId, listing_title: listing.title },
      });

    if (messageError) {
      console.warn("[conversations] Failed to create system message:", messageError);
    }

    return NextResponse.json({ conversation, isNew: true }, { status: 201 });
  } catch (error: any) {
    console.error("[conversations] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/v2/conversations - List user's conversations
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");
    const status = searchParams.get("status") || "ACTIVE";

    let query = supabase
      .from("conversation_summaries")
      .select("*")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .eq("status", status)
      .order("last_message_at", { ascending: false });

    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    const { data: conversations, error: convError } = await query;

    if (convError) {
      console.error("[conversations] GET error:", convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // Enrich with peer info
    const peerIds = new Set<string>();
    conversations?.forEach((c: any) => {
      const peerId = c.buyer_user_id === user.id ? c.seller_user_id : c.buyer_user_id;
      peerIds.add(peerId);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar")
      .in("id", Array.from(peerIds));

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Enrich with listing info
    const listingIds = Array.from(new Set(conversations?.map((c: any) => c.listing_id)));
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, price, images")
      .in("id", listingIds);

    const listingMap = new Map(listings?.map(l => [l.id, l]) || []);

    const enriched = conversations?.map((c: any) => {
      const peerId = c.buyer_user_id === user.id ? c.seller_user_id : c.buyer_user_id;
      const peer = profileMap.get(peerId);
      const listing = listingMap.get(c.listing_id);
      const isBuyer = c.buyer_user_id === user.id;
      const lastRead = isBuyer ? c.buyer_last_read_at : c.seller_last_read_at;
      const isUnread = !lastRead || (c.last_message_at && new Date(c.last_message_at) > new Date(lastRead));

      return {
        ...c,
        peer: peer ? { id: peer.id, name: peer.name, avatar: peer.avatar } : null,
        listing: listing ? {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          image: Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images[0]?.url || listing.images[0]
            : null,
        } : null,
        is_buyer: isBuyer,
        is_unread: isUnread,
      };
    });

    return NextResponse.json({ conversations: enriched || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[conversations] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
