import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/price-history?listing_id=xxx - Fetch price history for a listing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listing_id = searchParams.get("listing_id");

    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch price history
    const { data: history, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("listing_id", listing_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[price-history] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch price history" },
        { status: 500 }
      );
    }

    // Calculate stats
    const priceChanges = history?.filter((h) => h.old_price_gbp !== null) || [];
    const hasReduction = priceChanges.some((h) => (h.change_percentage || 0) < 0);
    const latestReduction = priceChanges
      .filter((h) => (h.change_percentage || 0) < 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    return NextResponse.json({
      history: history || [],
      stats: {
        total_changes: priceChanges.length,
        has_recent_reduction: hasReduction,
        latest_reduction: latestReduction || null,
      },
    });
  } catch (error) {
    console.error("[price-history] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
