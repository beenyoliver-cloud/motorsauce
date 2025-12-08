import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

// GET /api/offers-standalone - Get offers for current user
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
    const type = searchParams.get("type") || "all"; // all, sent, received

    let query = supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (type === "sent") {
      query = query.eq("buyer_id", user.id);
    } else if (type === "received") {
      query = query.eq("seller_id", user.id);
    } else {
      // all - offers where user is buyer or seller
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error("[offers-standalone API] Query error:", error);
      // Check if table doesn't exist
      if (error.code === "PGRST116") {
        return NextResponse.json({ 
          error: "Offers system not yet initialized. Please set up the database schema.",
          code: "NOT_INITIALIZED"
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ offers: offers || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[offers-standalone API] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/offers-standalone - Create a new offer
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
      listingId,
      sellerId,
      offeredAmount,
      listingTitle,
      listingImage,
      listingPrice,
      currency = "GBP",
      notes,
    } = body;

    // Validation
    if (!listingId || !sellerId || !offeredAmount || !listingTitle || listingPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (user.id === sellerId) {
      return NextResponse.json(
        { error: "Cannot make offer to yourself" },
        { status: 400 }
      );
    }

    console.log("[offers-standalone API] Creating offer:", {
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: sellerId,
      offered_amount: offeredAmount,
    });

    // Call RPC
    const { data: offerData, error: rpcError } = await supabase.rpc(
      "create_offer_standalone",
      {
        p_listing_id: listingId,
        p_seller_id: sellerId,
        p_listing_title: listingTitle,
        p_listing_price: listingPrice,
        p_offered_amount: offeredAmount,
        p_listing_image: listingImage || null,
        p_currency: currency,
        p_notes: notes || null,
      }
    );

    if (rpcError) {
      console.error("[offers-standalone API] RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Failed to create offer" },
        { status: 500 }
      );
    }

    console.log("[offers-standalone API] Offer created:", offerData);
    return NextResponse.json({ offer: offerData }, { status: 201 });
  } catch (error: any) {
    console.error("[offers-standalone API] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/offers-standalone - Respond to an offer
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
    const { offerId, status, counterAmount, counterNotes } = body;

    if (!offerId || !status) {
      return NextResponse.json(
        { error: "offerId and status are required" },
        { status: 400 }
      );
    }

    console.log("[offers-standalone API] Responding to offer:", {
      offer_id: offerId,
      status,
    });

    // Call RPC
    const { data: responseData, error: rpcError } = await supabase.rpc(
      "respond_offer_standalone",
      {
        p_offer_id: offerId,
        p_status: status,
        p_counter_amount: counterAmount || null,
        p_counter_notes: counterNotes || null,
      }
    );

    if (rpcError) {
      console.error("[offers-standalone API] RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Failed to respond to offer" },
        { status: 500 }
      );
    }

    console.log("[offers-standalone API] Offer responded:", responseData);
    return NextResponse.json({ result: responseData }, { status: 200 });
  } catch (error: any) {
    console.error("[offers-standalone API] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
