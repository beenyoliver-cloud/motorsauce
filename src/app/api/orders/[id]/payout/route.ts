import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

/**
 * POST /api/orders/:id/payout
 * Admin/system endpoint to mark payout released.
 *
 * Note: This does NOT move money by itself; it only updates DB state.
 * When Stripe Connect is integrated, this is where we would create a Transfer
 * and store payout_reference.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await ctx.params;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    // Basic admin gate: rely on existing /api/is-admin logic if present.
    // We keep it simple here to avoid inventing schema.
    const { data: isAdminRow, error: adminErr } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr) {
      console.error("[orders.payout] Admin check failed:", adminErr);
      return NextResponse.json({ error: "Admin check failed" }, { status: 500 });
    }

    if (!isAdminRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const payout_reference = typeof body?.payout_reference === "string" ? body.payout_reference.trim() : null;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payout_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[orders.payout] Failed to load order:", orderError);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payout_status === "released") {
      return NextResponse.json({ ok: true, already: true });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payout_status: "released",
        payout_released_at: new Date().toISOString(),
        payout_reference,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[orders.payout] Failed to update order:", updateError);
      return NextResponse.json({ error: "Failed to mark payout released" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[orders.payout] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
