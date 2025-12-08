import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

export async function POST(req: NextRequest) {
  try {
    const { listingId, action } = await req.json();

    if (!listingId || !action) {
      return NextResponse.json(
        { error: "Missing listingId or action" },
        { status: 400 }
      );
    }

    // Get user from session
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this listing
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check listing ownership
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: "You don't own this listing" },
        { status: 403 }
      );
    }

    // Update listing status
    let newStatus: "active" | "sold";
    let markedSoldAt: string | null;

    if (action === "mark_sold") {
      newStatus = "sold";
      markedSoldAt = new Date().toISOString();
    } else if (action === "mark_active") {
      newStatus = "active";
      markedSoldAt = null;
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'mark_sold' or 'mark_active'" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        status: newStatus,
        marked_sold_at: markedSoldAt,
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("Error updating listing status:", updateError);
      return NextResponse.json(
        { error: "Failed to update listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      marked_sold_at: markedSoldAt,
    });
  } catch (error) {
    console.error("Error in mark-sold API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
