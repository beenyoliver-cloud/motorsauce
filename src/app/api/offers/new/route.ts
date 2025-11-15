// src/app/api/offers/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      .select("*")
      .order("created_at", { ascending: false });

    if (threadId) {
      query = query.eq("thread_id", threadId);
    }

    const { data: offers, error: offersError } = await query;

    if (offersError) {
      console.error("[offers API] Error fetching offers:", offersError);
      return NextResponse.json({ error: offersError.message }, { status: 500 });
    }

    return NextResponse.json({ offers: offers || [] }, { status: 200 });
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
      listingId,
      listingTitle,
      listingImage,
      recipientId,
      amountCents,
      currency = "GBP",
    } = body;

    if (!threadId || !listingId || !recipientId || !amountCents) {
      return NextResponse.json(
        { error: "threadId, listingId, recipientId, and amountCents are required" },
        { status: 400 }
      );
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: "Cannot make offer to yourself" }, { status: 400 });
    }

    // Verify thread exists and user has access
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        thread_id: threadId,
        listing_id: listingId,
        listing_title: listingTitle,
        listing_image: listingImage,
        starter_id: user.id,
        recipient_id: recipientId,
        amount_cents: amountCents,
        currency,
        status: "pending",
      })
      .select()
      .single();

    if (offerError) {
      console.error("[offers API] Create error:", offerError);
      return NextResponse.json({ error: offerError.message }, { status: 500 });
    }

    // Create system message for the offer
    await supabase.from("messages").insert({
      thread_id: threadId,
      from_user_id: user.id,
      message_type: "system",
      text_content: `Started an offer of £${(amountCents / 100).toFixed(2)}`,
    });

    // Create offer message
    await supabase.from("messages").insert({
      thread_id: threadId,
      from_user_id: user.id,
      message_type: "offer",
      offer_id: offer.id,
      offer_amount_cents: amountCents,
      offer_currency: currency,
      offer_status: "pending",
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error: any) {
    console.error("[offers API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/offers - Update offer status
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

    const validStatuses = ["pending", "accepted", "declined", "countered", "withdrawn", "expired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch offer to verify access
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Update offer
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "countered" && counterAmountCents) {
      updates.amount_cents = counterAmountCents;
    }

    const { data: updated, error: updateError } = await supabase
      .from("offers")
      .update(updates)
      .eq("id", offerId)
      .select()
      .single();

    if (updateError) {
      console.error("[offers API] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update corresponding message
    await supabase
      .from("messages")
      .update({
        offer_status: status,
        offer_amount_cents: updates.amount_cents || offer.amount_cents,
        updated_at: new Date().toISOString(),
      })
      .eq("offer_id", offerId);

    // Add system message about status change
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const userName = profile?.name || "Someone";
    let statusText = "";
    if (status === "accepted") statusText = `${userName} accepted the offer`;
    else if (status === "declined") statusText = `${userName} declined the offer`;
    else if (status === "countered") statusText = `${userName} countered with £${(updates.amount_cents / 100).toFixed(2)}`;
    else if (status === "withdrawn") statusText = `${userName} withdrew the offer`;

    if (statusText) {
      await supabase.from("messages").insert({
        thread_id: offer.thread_id,
        from_user_id: user.id,
        message_type: "system",
        text_content: statusText,
      });
    }

    return NextResponse.json({ offer: updated }, { status: 200 });
  } catch (error: any) {
    console.error("[offers API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
