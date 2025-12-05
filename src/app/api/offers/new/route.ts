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
    let offer = offerData as any;

    if (rpcError) {
      console.error("[offers API] RPC create_offer_uuid error:", {
        message: rpcError.message,
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      // Fallback to old name if wrapper not yet deployed
      const ambiguous = (rpcError.details || "").includes("Could not choose the best candidate function");
      if (!ambiguous) {
        const fallback = await supabase.rpc("create_offer", {
          p_thread_id: threadId,
          p_listing_id: listingId,
          p_amount_cents: amountCents,
          p_currency: currency || "GBP",
          p_listing_title: listingTitle || null,
          p_listing_image: listingImage || null,
        });
        offer = fallback.data as any;
        if (fallback.error) {
          console.error("[offers API] RPC create_offer (fallback) error:", fallback.error);
          return NextResponse.json({
            error: fallback.error.message || "RPC call failed",
            code: fallback.error.code,
            details: fallback.error.details,
            hint: fallback.error.hint,
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: rpcError.message || "RPC overload ambiguity; deploy fix_offers_rpc.sql",
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        }, { status: 500 });
      }
    }

    console.log("[offers API] Offer created successfully:", offer);
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

    // Use RPC to respond (accept/decline/counter)
    console.log("[offers API] Calling RPC respond_offer with params:", {
      p_offer_id: offerId,
      p_status: status,
      p_counter_amount_cents: counterAmountCents || null,
      offer_details: offer,
    });

    const { data: responded, error: respErr } = await supabase.rpc("respond_offer", {
      p_offer_id: offerId,
      p_status: status,
      p_counter_amount_cents: counterAmountCents || null,
    });

    if (respErr) {
      console.error("[offers API] RPC respond_offer error:", {
        message: respErr.message,
        code: respErr.code,
        details: respErr.details,
        hint: respErr.hint,
        fullError: JSON.stringify(respErr),
      });
      
      // Return more detailed error to client for debugging
      return NextResponse.json({ 
        error: respErr.message || "RPC call failed",
        code: respErr.code,
        details: respErr.details,
        hint: respErr.hint,
        debugInfo: {
          offerId,
          status,
          counterAmountCents,
          offerStatus: offer.status,
          offerStarterId: offer.starter_id,
          offerRecipientId: offer.recipient_id,
          currentUserId: user.id,
        }
      }, { status: 500 });
    }

    console.log("[offers API] Offer response processed:", responded);
    return NextResponse.json({ offer: responded }, { status: 200 });
  } catch (error: any) {
    console.error("[offers API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
