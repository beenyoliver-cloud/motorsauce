// src/app/api/offers/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || null;

const DB_TO_CLIENT_STATUS: Record<string, string> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "declined",
  COUNTERED: "countered",
  CANCELLED: "withdrawn",
  EXPIRED: "expired",
  COMPLETED: "completed",
};

const CLIENT_TO_DB_STATUS: Record<string, string> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  declined: "REJECTED",
  rejected: "REJECTED",
  countered: "COUNTERED",
  withdrawn: "CANCELLED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
  completed: "COMPLETED",
};

function getSupabase(authHeader?: string | null) {
  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  
  return client;
}

async function createNotificationForOffer(offer: any) {
  if (!supabaseServiceKey) return;
  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (!offer?.created_by_user_id) return;
    await adminClient.from("notifications").insert({
      user_id: offer.created_by_user_id,
      type: "payment_required",
      title: "Payment required",
      message: `Your offer of £${(offer.amount / 100).toFixed(2)} was accepted. Complete checkout to finish the purchase.`,
      link: `/checkout?offer_id=${offer.id}`,
      read: false,
    });
  } catch (err) {
    console.error("[offers API] Failed to create notification:", err);
  }
}

function mapOffer(row: any, listingMap: Map<string, any>, conversationMap?: Map<string, any>) {
  const listing = listingMap.get(row.listing_id);
  const conversation = conversationMap?.get(row.conversation_id);
  return {
    id: row.id,
    threadId: row.conversation_id,
    listingId: row.listing_id,
    listingTitle: listing?.title || null,
    listingImage: listing?.image || listing?.images?.[0] || null,
    starterId: row.created_by_user_id,
    recipientId: row.offered_to_user_id,
    buyerId: conversation?.buyer_user_id ?? null,
    sellerId: conversation?.seller_user_id ?? null,
    amountCents: row.amount,
    currency: row.currency || "GBP",
    status: DB_TO_CLIENT_STATUS[row.status] || row.status?.toLowerCase?.() || row.status,
    quantity: row.quantity,
    expires_at: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/offers?threadId=... - Get offers for a thread or user
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
    const threadId = searchParams.get("threadId");

    let query = supabase
      .from("offers")
      .select(
        `
          id,
          conversation_id,
          listing_id,
          created_by_user_id,
          offered_to_user_id,
          currency,
          amount,
          quantity,
          status,
          expires_at,
          created_at,
          updated_at,
          conversation:conversation_id (buyer_user_id, seller_user_id)
        `
      )
      .order("created_at", { ascending: false });

    if (threadId) {
      query = query.eq("conversation_id", threadId);
    }

    const { data: offers, error: offersError } = await query;

    if (offersError) {
      console.error("[offers API] Error fetching offers:", offersError);
      return NextResponse.json({ error: offersError.message }, { status: 500 });
    }

    const listingIds = Array.from(new Set((offers || []).map((o: any) => o.listing_id).filter(Boolean)));
    let listingMap = new Map<string, any>();
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, images, image_urls")
        .in("id", listingIds);
      if (listings) {
        listingMap = new Map(
          listings.map((l: any) => [
            l.id,
            {
              title: l.title,
              image:
                (Array.isArray(l.images) && l.images.length > 0 && (l.images[0]?.url || l.images[0])) ||
                (Array.isArray(l.image_urls) && l.image_urls.length > 0 ? l.image_urls[0] : null) ||
                null,
              images: l.images || l.image_urls || [],
            },
          ])
        );
      }
    }

    const conversationMap = new Map<string, any>(
      (offers || [])
        .map((o: any) => [o.conversation_id, o.conversation] as [string, any])
        .filter(([, v]) => Boolean(v))
    );

    const shaped = (offers || []).map((o: any) => mapOffer(o, listingMap, conversationMap));

    return NextResponse.json({ offers: shaped }, { status: 200 });
  } catch (error: any) {
    console.error("[offers API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/offers - Create a new offer
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
    const {
      threadId,
      amountCents,
      currency = "GBP",
    } = body;

    if (!threadId || !amountCents) {
      return NextResponse.json(
        { error: "threadId and amountCents are required" },
        { status: 400 }
      );
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, type, listing_id, buyer_user_id, seller_user_id")
      .eq("id", threadId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isBuyer = conversation.buyer_user_id === user.id;
    const isSeller = conversation.seller_user_id === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (conversation.type !== "LISTING" || !conversation.listing_id) {
      return NextResponse.json({ error: "Offers are only allowed in listing conversations" }, { status: 400 });
    }

    const recipientId = isBuyer ? conversation.seller_user_id : conversation.buyer_user_id;
    if (recipientId === user.id) {
      return NextResponse.json({ error: "Cannot make offer to yourself" }, { status: 400 });
    }

    // Create offer directly (unique pending enforced by DB constraint)
    const { data: inserted, error: insertError } = await supabase
      .from("offers")
      .insert({
        conversation_id: threadId,
        listing_id: conversation.listing_id,
        created_by_user_id: user.id,
        offered_to_user_id: recipientId,
        currency: currency || "GBP",
        amount: amountCents,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      const code = insertError?.code || insertError?.hint;
      if (code === "23505") {
        return NextResponse.json({ error: "A pending offer already exists in this conversation" }, { status: 409 });
      }
      console.error("[offers API] Insert error:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to create offer" }, { status: 500 });
    }

    // Insert offer card message
    await supabase
      .from("messages_v2")
      .insert({
        conversation_id: threadId,
        sender_user_id: user.id,
        type: "OFFER_CARD",
        metadata: {
          offer_id: inserted.id,
          amount_cents: inserted.amount,
          currency: inserted.currency,
          status: DB_TO_CLIENT_STATUS[inserted.status] || inserted.status,
        },
      });

    const shaped = mapOffer(inserted, new Map(), new Map([[threadId, conversation]]));
    console.log("[offers API] Offer created successfully:", shaped);
    return NextResponse.json({ offer: shaped }, { status: 201 });
  } catch (error: any) {
    console.error("[offers API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/offers - Update offer status (direct approach, bypassing problematic RPC)
export async function PATCH(req: Request) {
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
    const { offerId, status, counterAmountCents } = body;

    if (!offerId || !status) {
      return NextResponse.json({ error: "offerId and status are required" }, { status: 400 });
    }

    const normalizedStatus = status.toString().toLowerCase();
    const dbStatus = CLIENT_TO_DB_STATUS[normalizedStatus];
    if (!dbStatus) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch offer to verify access and current state
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*, conversation:conversation_id (buyer_user_id, seller_user_id, type, listing_id)")
      .eq("id", offerId)
      .single();

    if (fetchError || !offer) {
      console.error("[offers API] Offer fetch error:", fetchError);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const conversation = offer.conversation;
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isBuyer = conversation.buyer_user_id === user.id;
    const isSeller = conversation.seller_user_id === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (conversation.type !== "LISTING" || !conversation.listing_id) {
      return NextResponse.json({ error: "Offers are only allowed in listing conversations" }, { status: 400 });
    }

    const isCreator = offer.created_by_user_id === user.id;
    const isRecipient = offer.offered_to_user_id === user.id;
    if (["ACCEPTED", "REJECTED", "COUNTERED"].includes(dbStatus) && !isRecipient) {
      return NextResponse.json({ error: "Only the recipient can respond to this offer" }, { status: 403 });
    }
    if (dbStatus === "CANCELLED" && !isCreator) {
      return NextResponse.json({ error: "Only the creator can cancel this offer" }, { status: 403 });
    }

    if (offer.status !== "PENDING") {
      return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (dbStatus === "COUNTERED") {
      if (!counterAmountCents || counterAmountCents <= 0) {
        return NextResponse.json({ error: "counterAmountCents is required to counter" }, { status: 400 });
      }

      // Mark current offer as COUNTERED
      const { error: markErr } = await supabase
        .from("offers")
        .update({ status: "COUNTERED", updated_at: now, cancelled_at: now })
        .eq("id", offerId);
      if (markErr) {
        console.error("[offers API] Failed to mark original offer countered:", markErr);
        return NextResponse.json({ error: "Failed to counter offer" }, { status: 500 });
      }

      // Create counter offer from recipient to creator
      const { data: counterOffer, error: counterInsertError } = await supabase
        .from("offers")
        .insert({
          conversation_id: offer.conversation_id,
          listing_id: conversation.listing_id,
          created_by_user_id: user.id,
          offered_to_user_id: isBuyer ? conversation.seller_user_id : conversation.buyer_user_id,
          currency: offer.currency,
          amount: counterAmountCents,
          parent_offer_id: offerId,
          status: "PENDING",
        })
        .select()
        .single();

      if (counterInsertError || !counterOffer) {
        console.error("[offers API] Counter offer insert error:", counterInsertError);
        return NextResponse.json({ error: counterInsertError?.message || "Failed to create counter offer" }, { status: 500 });
      }

      await supabase.from("messages_v2").insert({
        conversation_id: offer.conversation_id,
        sender_user_id: user.id,
        type: "OFFER_CARD",
        metadata: {
          offer_id: counterOffer.id,
          amount_cents: counterOffer.amount,
          currency: counterOffer.currency,
          status: "pending",
          parent_offer_id: offerId,
        },
      });

      const shapedCounter = mapOffer(counterOffer, new Map(), new Map([[offer.conversation_id, conversation]]));
      return NextResponse.json({ offer: shapedCounter }, { status: 200 });
    }

    const updateData: any = {
      status: dbStatus,
      updated_at: now,
    };

    if (dbStatus === "ACCEPTED") updateData.accepted_at = now;
    if (dbStatus === "REJECTED") updateData.rejected_at = now;
    if (dbStatus === "CANCELLED") updateData.cancelled_at = now;

    const { data: updatedOffer, error: updateError } = await supabase
      .from("offers")
      .update(updateData)
      .eq("id", offerId)
      .select()
      .single();

    if (updateError) {
      console.error("[offers API] Update error:", updateError);
      return NextResponse.json({
        error: updateError.message || "Failed to update offer",
        code: updateError.code,
        details: updateError.details,
      }, { status: 500 });
    }

    if (dbStatus === "ACCEPTED") {
      await createNotificationForOffer({ ...offer, ...updatedOffer });
    }

    const systemText = (() => {
      const price = `£${(offer.amount / 100).toFixed(2)}`;
      if (dbStatus === "ACCEPTED") return `Offer accepted at ${price}.`;
      if (dbStatus === "REJECTED") return `Offer declined (${price}).`;
      if (dbStatus === "CANCELLED") return `Offer withdrawn (${price}).`;
      return `Offer status changed to ${status}`;
    })();

    await supabase.from("messages_v2").insert({
      conversation_id: offer.conversation_id,
      sender_user_id: user.id,
      type: "SYSTEM",
      body: systemText,
    });

    const shaped = mapOffer(updatedOffer, new Map(), new Map([[offer.conversation_id, conversation]]));
    return NextResponse.json({ offer: shaped }, { status: 200 });
  } catch (error: any) {
    console.error("[offers API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
