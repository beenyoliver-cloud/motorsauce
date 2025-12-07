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
    console.log("[offers API] Creating offer with data:", {
      thread_id: threadId,
      listing_id: listingId,
      starter_id: user.id,
      recipient_id: recipientId,
      amount_cents: amountCents,
    });

    // Use RPC to create offer and emit messages atomically
    console.log("[offers API] Calling RPC create_offer with params:", {
      p_thread_id: threadId,
      p_listing_id: listingId,
      p_amount_cents: amountCents,
      p_currency: currency || "GBP",
      p_listing_title: listingTitle || null,
      p_listing_image: listingImage || null,
    });

    // Prefer a disambiguated wrapper to avoid PostgREST overload ambiguity
    const { data: offerData, error: rpcError } = await supabase.rpc("create_offer_uuid", {
      p_thread_id: threadId,
      p_listing_id: listingId,
      p_amount_cents: amountCents,
      p_currency: currency || "GBP",
      p_listing_title: listingTitle || null,
      p_listing_image: listingImage || null,
    });
    
    console.log("[offers API] RPC Response - Type:", typeof offerData, "Value:", JSON.stringify(offerData));
    
    if (rpcError) {
      console.error("[offers API] RPC create_offer_uuid error:", {
        message: rpcError.message,
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return NextResponse.json({ 
        error: rpcError.message || "Failed to create offer",
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint,
      }, { status: 500 });
    }

    // offerData is already the JSON object returned by the RPC
    const offer = offerData as any;
    
    if (!offer || !offer.id) {
      console.error("[offers API] RPC returned invalid offer:", offer);
      return NextResponse.json({ 
        error: "RPC returned invalid offer data",
        received: offer,
      }, { status: 500 });
    }

    console.log("[offers API] Offer created successfully:", offer);
    return NextResponse.json({ offer }, { status: 201 });
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

    const validStatuses = ["pending", "accepted", "declined", "countered", "withdrawn", "expired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch offer to verify access and current state
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (fetchError || !offer) {
      console.error("[offers API] Offer fetch error:", fetchError);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    console.log("[offers API] Updating offer:", {
      offerId,
      currentStatus: offer.status,
      newStatus: status,
      userId: user.id,
      offer
    });

    // Validate authorization and status transitions
    if (status === "withdrawn") {
      if (offer.starter_id !== user.id) {
        return NextResponse.json({ error: "Only buyer can withdraw" }, { status: 403 });
      }
      if (offer.status !== "pending") {
        return NextResponse.json({ error: "Can only withdraw pending offers" }, { status: 400 });
      }
    } else if (status === "accepted") {
      if (offer.recipient_id !== user.id) {
        return NextResponse.json({ error: "Only seller can accept" }, { status: 403 });
      }
      if (!["pending", "countered"].includes(offer.status)) {
        return NextResponse.json({ error: "Can only accept pending or countered offers" }, { status: 400 });
      }
    } else if (status === "declined") {
      // Only the recipient (person who receives the offer) can decline
      if (offer.recipient_id !== user.id) {
        return NextResponse.json({ error: "Only the recipient of this offer can decline it" }, { status: 403 });
      }
      if (offer.status !== "pending") {
        return NextResponse.json({ error: "Can only decline pending offers" }, { status: 400 });
      }
    } else if (status === "countered") {
      // Allow recipient to counter pending offers
      if (offer.recipient_id !== user.id) {
        return NextResponse.json({ error: "Only recipient can counter" }, { status: 403 });
      }
      if (offer.status !== "pending") {
        return NextResponse.json({ error: "Can only counter pending offers" }, { status: 400 });
      }
      if (!counterAmountCents || counterAmountCents <= 0) {
        return NextResponse.json({ error: "Invalid counter amount" }, { status: 400 });
      }
    }

    // Update offer directly (simpler than RPC to avoid RLS issues)
    const updateData: any = {
      status,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (counterAmountCents) {
      updateData.counter_amount = counterAmountCents / 100;
    }

    console.log("[offers API] Updating with data:", updateData);

    const { data: updatedOffer, error: updateError } = await supabase
      .from("offers")
      .update(updateData)
      .eq("id", offerId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[offers API] Update error:", updateError);
      return NextResponse.json({ 
        error: updateError.message || "Failed to update offer",
        code: updateError.code,
        details: updateError.details,
      }, { status: 500 });
    }

    console.log("[offers API] Offer updated successfully:", updatedOffer);

    // Create system message to notify parties
    const systemText = (() => {
      if (status === "accepted") {
        return `✅ Seller accepted the offer of £${(offer.amount_cents / 100).toFixed(2)}.`;
      } else if (status === "declined") {
        return `❌ Seller declined the offer of £${(offer.amount_cents / 100).toFixed(2)}.`;
      } else if (status === "countered") {
        const counterPrice = (counterAmountCents! / 100).toFixed(2);
        return `📊 Seller countered with £${counterPrice}.`;
      } else if (status === "withdrawn") {
        return `⚠️ Buyer withdrew their offer of £${(offer.amount_cents / 100).toFixed(2)}.`;
      }
      return `Offer status changed to ${status}`;
    })();

    // Insert system message
    const { error: msgError } = await supabase
      .from("messages")
      .insert({
        thread_id: offer.thread_id,
        from_user_id: user.id,
        message_type: "system",
        text_content: systemText,
      });

    if (msgError) {
      console.error("[offers API] Message insert error:", msgError);
      // Non-fatal - offer was updated successfully
    }

    return NextResponse.json({ offer: updatedOffer }, { status: 200 });
  } catch (error: any) {
    console.error("[offers API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
