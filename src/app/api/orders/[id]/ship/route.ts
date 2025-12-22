import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

/**
 * POST /api/orders/:id/ship
 * Seller marks an order as shipped.
 *
 * Body: { shipping_carrier?: string, tracking_number?: string }
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

    const body = await req.json().catch(() => ({}));
    const shipping_carrier = typeof body?.shipping_carrier === "string" ? body.shipping_carrier.trim() : null;
    const tracking_number = typeof body?.tracking_number === "string" ? body.tracking_number.trim() : null;

    // Ensure the current user is a seller on this order
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, seller_id")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("[orders.ship] Failed to load items:", itemsError);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }

    const sellerIds = new Set((orderItems || []).map((i: any) => i.seller_id).filter(Boolean));
    if (!sellerIds.has(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Read current order state (idempotency)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, shipped_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[orders.ship] Failed to load order:", orderError);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Order is cancelled" }, { status: 409 });
    }

    if (order.shipped_at) {
      // already shipped: idempotent success
      return NextResponse.json({ ok: true, already: true });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        shipped_at: new Date().toISOString(),
        shipped_by: user.id,
        shipping_carrier,
        tracking_number,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[orders.ship] Failed to update order:", updateError);
      return NextResponse.json({ error: "Failed to mark shipped" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[orders.ship] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
