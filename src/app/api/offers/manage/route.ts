// API route for managing offers
// GET: Fetch offers for a user (as buyer or seller)
// POST: Create a new offer
// PATCH: Update offer status (accept, reject, counter, withdraw)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DB_TO_CLIENT_STATUS: Record<string, string> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COUNTERED: "countered",
  CANCELLED: "withdrawn",
  EXPIRED: "expired",
};

const CLIENT_TO_DB_STATUS: Record<string, string> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  declined: "REJECTED",
  countered: "COUNTERED",
  withdrawn: "CANCELLED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
};

// Helper to get authenticated user
async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

// GET: Fetch offers
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // "buyer" or "seller"
    const listingId = searchParams.get("listing_id");
    const status = searchParams.get("status");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from("offers")
      .select(`
        *,
        conversation:conversation_id (buyer_user_id, seller_user_id),
        listing:listing_id (id, title, price, images, image_urls, status)
      `)
      .order("created_at", { ascending: false });

    if (role === "buyer") {
      query = query.eq("created_by_user_id", user.id);
    } else if (role === "seller") {
      query = query.eq("offered_to_user_id", user.id);
    } else {
      query = query.or(`created_by_user_id.eq.${user.id},offered_to_user_id.eq.${user.id}`);
    }

    // Filter by listing
    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    // Filter by status
    if (status) {
      query = query.eq("status", status.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching offers:", error);
      return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
    }

    const userIds = new Set<string>();
    (data || []).forEach((o: any) => {
      userIds.add(o.created_by_user_id);
      userIds.add(o.offered_to_user_id);
      if (o.conversation?.buyer_user_id) userIds.add(o.conversation.buyer_user_id);
      if (o.conversation?.seller_user_id) userIds.add(o.conversation.seller_user_id);
    });

    let profileMap = new Map<string, any>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar")
        .in("id", Array.from(userIds));
      if (profiles) {
        profileMap = new Map(profiles.map((p: any) => [p.id, p]));
      }
    }

    const shaped = (data || []).map((o: any) => {
      const listing = o.listing || {};
      const buyerId = o.conversation?.buyer_user_id;
      const sellerId = o.conversation?.seller_user_id;
      const buyerProfile = buyerId ? profileMap.get(buyerId) : null;
      const sellerProfile = sellerId ? profileMap.get(sellerId) : null;
      const image =
        (Array.isArray(listing.images) && listing.images.length > 0 && (listing.images[0]?.url || listing.images[0])) ||
        (Array.isArray(listing.image_urls) && listing.image_urls.length > 0 ? listing.image_urls[0] : null) ||
        null;

      return {
        id: o.id,
        listing_id: o.listing_id,
        starter: o.created_by_user_id,
        recipient: o.offered_to_user_id,
        amount: (o.amount || 0) / 100,
        message: null,
        status: DB_TO_CLIENT_STATUS[o.status] || o.status?.toLowerCase?.() || o.status,
        counter_amount: null,
        counter_message: null,
        expires_at: o.expires_at,
        created_at: o.created_at,
        responded_at: o.updated_at || null,
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          images: listing.images || listing.image_urls || [],
          status: listing.status,
          image,
        },
        buyer: buyerId
          ? { id: buyerId, name: buyerProfile?.name || "Buyer", avatar_url: buyerProfile?.avatar || null }
          : null,
        seller: sellerId
          ? { id: sellerId, name: sellerProfile?.name || "Seller", avatar_url: sellerProfile?.avatar || null }
          : null,
      };
    });

    return NextResponse.json({ offers: shaped });
  } catch (error) {
    console.error("GET /api/offers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a new offer
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // In the new schema offers must be tied to a conversation; this endpoint is disabled.
    return NextResponse.json({ error: "Direct offer creation is disabled in the new messaging schema" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/offers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update offer status
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { offer_id, action, counter_amount_cents } = body;

    if (!offer_id || !action) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*, conversation:conversation_id (buyer_user_id, seller_user_id, listing_id, type)")
      .eq("id", offer_id)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const conversation = offer.conversation;
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isCreator = offer.created_by_user_id === user.id;
    const isRecipient = offer.offered_to_user_id === user.id;

    if (action === "counter") {
      if (!isRecipient || offer.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot counter this offer" }, { status: 403 });
      }
      if (!counter_amount_cents || counter_amount_cents <= 0) {
        return NextResponse.json({ error: "Invalid counter amount" }, { status: 400 });
      }

      const now = new Date().toISOString();
      const { error: markErr } = await supabase
        .from("offers")
        .update({ status: "COUNTERED", updated_at: now })
        .eq("id", offer_id);
      if (markErr) {
        console.error("Failed to mark offer countered:", markErr);
        return NextResponse.json({ error: "Failed to counter offer" }, { status: 500 });
      }

      const { data: counterOffer, error: counterErr } = await supabase
        .from("offers")
        .insert({
          conversation_id: offer.conversation_id,
          listing_id: conversation.listing_id,
          created_by_user_id: user.id,
          offered_to_user_id: isCreator ? conversation.seller_user_id : conversation.buyer_user_id,
          currency: offer.currency,
          amount: counter_amount_cents,
          parent_offer_id: offer_id,
          status: "PENDING",
        })
        .select()
        .single();

      if (counterErr || !counterOffer) {
        console.error("Failed to create counter offer:", counterErr);
        return NextResponse.json({ error: "Failed to create counter offer" }, { status: 500 });
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
          parent_offer_id: offer_id,
        },
      });

      return NextResponse.json({ offer: counterOffer });
    }

    const targetStatus =
      action === "withdraw"
        ? "CANCELLED"
        : action === "accept" || action === "accept_counter"
        ? "ACCEPTED"
        : action === "reject"
        ? "REJECTED"
        : null;

    if (!targetStatus) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (offer.status !== "PENDING" && !(action === "accept_counter" && offer.status === "COUNTERED")) {
      return NextResponse.json({ error: "Offer is no longer actionable" }, { status: 400 });
    }

    if (targetStatus === "CANCELLED" && !isCreator) {
      return NextResponse.json({ error: "Only the creator can withdraw" }, { status: 403 });
    }
    if (targetStatus !== "CANCELLED" && !isRecipient) {
      return NextResponse.json({ error: "Only the recipient can respond" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updateData: any = { status: targetStatus, updated_at: now };
    if (targetStatus === "ACCEPTED") updateData.accepted_at = now;
    if (targetStatus === "REJECTED") updateData.rejected_at = now;
    if (targetStatus === "CANCELLED") updateData.cancelled_at = now;

    const { data: updatedOffer, error: updateError } = await supabase
      .from("offers")
      .update(updateData)
      .eq("id", offer_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating offer:", updateError);
      return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
    }

    await supabase.from("messages_v2").insert({
      conversation_id: offer.conversation_id,
      sender_user_id: user.id,
      type: "SYSTEM",
      body: `Offer ${DB_TO_CLIENT_STATUS[targetStatus] || targetStatus.toLowerCase()} for £${(
        (offer.amount || 0) / 100
      ).toFixed(2)}.`,
    });

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error("PATCH /api/offers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
