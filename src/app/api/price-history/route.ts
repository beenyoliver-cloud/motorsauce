import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
  Enhanced logging added to help diagnose 500 errors in production.
  Logs avoid leaking secret values; only presence/length metadata is recorded.
*/

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET /api/price-history?listing_id=xxx - Fetch price history for a listing
export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const listing_id = searchParams.get("listing_id");
    const debug = searchParams.get("debug") === "1";

    if (!listing_id) {
      console.warn("[price-history] Missing listing_id param");
      return NextResponse.json({ error: "listing_id is required" }, { status: 400 });
    }

    // Validate environment configuration early
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[price-history] Missing Supabase env vars", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return NextResponse.json({ error: "Service configuration error" }, { status: 500 });
    }

    // Create client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Perform query
    const { data: history, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("listing_id", listing_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[price-history] Query error", {
        listing_id,
        code: (error as any)?.code,
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
    }

    const safeHistory = Array.isArray(history) ? history : [];
    const priceChanges = safeHistory.filter((h) => h.old_price_gbp !== null);
    const hasReduction = priceChanges.some((h) => (h.change_percentage || 0) < 0);
    const latestReduction = priceChanges
      .filter((h) => (h.change_percentage || 0) < 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

    console.log("[price-history] Success", {
      listing_id,
      rows: safeHistory.length,
      changes: priceChanges.length,
      reduced: hasReduction,
      ms: Date.now() - started,
    });

    const payload: any = {
      history: safeHistory,
      stats: {
        total_changes: priceChanges.length,
        has_recent_reduction: hasReduction,
        latest_reduction: latestReduction,
      },
    };
    if (debug) {
      payload._debug = {
        env: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
        },
        timing_ms: Date.now() - started,
        listing_id,
        rows: safeHistory.length,
      };
    }
    return NextResponse.json(payload, { status: 200, headers: { "X-Price-History-Trace": "v2" } });
  } catch (error) {
    console.error("[price-history] Uncaught error", {
      listing_id: new URL(req.url).searchParams.get("listing_id"),
      err: (error as any)?.message || error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
