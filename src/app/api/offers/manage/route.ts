// API route for managing offers
// GET: Fetch offers for a user (as buyer or seller)
// POST: Create a new offer
// PATCH: Update offer status (accept, reject, counter, withdraw)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
        listing:listing_id(id, title, price, images, status),
        buyer:starter(id, name, avatar_url),
        seller:recipient(id, name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    // Filter by role (using starter for buyer, recipient for seller)
    if (role === "buyer") {
      query = query.eq("starter", user.id);
    } else if (role === "seller") {
      query = query.eq("recipient", user.id);
    } else {
      // Return both buyer and seller offers
      query = query.or(`starter.eq.${user.id},recipient.eq.${user.id}`);
    }

    // Filter by listing
    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    // Filter by status
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching offers:", error);
      return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
    }

    return NextResponse.json({ offers: data || [] });
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
    const { listing_id, amount_cents, message } = body;

    if (!listing_id || !amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: "Invalid offer data" }, { status: 400 });
    }

    // Convert cents to decimal amount
    const amount = amount_cents / 100;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get listing to find seller
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("seller_id, price")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: "Cannot make offer on your own listing" }, { status: 400 });
    }

    // Check for existing pending offer (using starter for buyer)
    const { data: existingOffer } = await supabase
      .from("offers")
      .select("id")
      .eq("listing_id", listing_id)
      .eq("starter", user.id)
      .eq("status", "pending")
      .single();

    if (existingOffer) {
      return NextResponse.json({ error: "You already have a pending offer on this listing" }, { status: 400 });
    }

    // Create offer (starter = buyer, recipient = seller, amount in decimal)
    const { data: offer, error: createError } = await supabase
      .from("offers")
      .insert({
        listing_id,
        starter: user.id,
        recipient: listing.seller_id,
        amount,
        message: message || null,
        status: "pending",
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating offer:", createError);
      return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
    }

    return NextResponse.json({ offer });
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
    const { offer_id, action, counter_amount_cents, counter_message } = body;

    if (!offer_id || !action) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get offer
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offer_id)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check permissions and valid actions (using starter=buyer, recipient=seller)
    let updates: any = { responded_at: new Date().toISOString() };

    if (action === "withdraw") {
      // Buyer (starter) can withdraw pending offer
      if (offer.starter !== user.id || offer.status !== "pending") {
        return NextResponse.json({ error: "Cannot withdraw this offer" }, { status: 403 });
      }
      updates.status = "withdrawn";
    } else if (action === "accept") {
      // Seller (recipient) can accept pending or countered offer
      if (offer.recipient !== user.id || !["pending", "countered"].includes(offer.status)) {
        return NextResponse.json({ error: "Cannot accept this offer" }, { status: 403 });
      }
      updates.status = "accepted";
    } else if (action === "reject") {
      // Seller (recipient) can reject pending offer
      if (offer.recipient !== user.id || offer.status !== "pending") {
        return NextResponse.json({ error: "Cannot reject this offer" }, { status: 403 });
      }
      updates.status = "rejected";
    } else if (action === "counter") {
      // Seller (recipient) can counter pending offer
      if (offer.recipient !== user.id || offer.status !== "pending") {
        return NextResponse.json({ error: "Cannot counter this offer" }, { status: 403 });
      }
      if (!counter_amount_cents || counter_amount_cents <= 0) {
        return NextResponse.json({ error: "Invalid counter amount" }, { status: 400 });
      }
      updates.status = "countered";
      updates.counter_amount = counter_amount_cents / 100; // Convert to decimal
      updates.counter_message = counter_message || null;
    } else if (action === "accept_counter") {
      // Buyer (starter) can accept seller's counter offer
      if (offer.starter !== user.id || offer.status !== "countered") {
        return NextResponse.json({ error: "Cannot accept counter offer" }, { status: 403 });
      }
      updates.status = "accepted";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update offer
    const { data: updatedOffer, error: updateError } = await supabase
      .from("offers")
      .update(updates)
      .eq("id", offer_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating offer:", updateError);
      return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
    }

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error("PATCH /api/offers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
