import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotificationServer } from "@/lib/notificationsServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

/**
 * POST /api/orders/:id/receive
 * Buyer confirms item received. This is the trigger to release held funds.
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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, buyer_id, status, delivery_confirmed_at, payout_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[orders.receive] Failed to load order:", orderError);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Order is cancelled" }, { status: 409 });
    }

    if (order.delivery_confirmed_at) {
      // already confirmed: idempotent success
      return NextResponse.json({ ok: true, already: true });
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("seller_id, title")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("[orders.receive] Failed to load order items:", itemsError);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }

    // Mark delivered + request payout release.
    // If/when Stripe Connect payout exists, this route is where we'd create the Transfer.
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        delivery_confirmed_at: new Date().toISOString(),
        delivery_confirmed_by: user.id,
        payout_status: "release_requested",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[orders.receive] Failed to update order:", updateError);
      return NextResponse.json({ error: "Failed to confirm delivery" }, { status: 500 });
    }

    // Notify each seller that the buyer has confirmed delivery (funds can release soon).
    try {
      const sellerIds = Array.from(
        new Set((orderItems || []).map((item: any) => item?.seller_id).filter(Boolean))
      );
      const firstTitle = orderItems?.[0]?.title || "your order";

      await Promise.all(
        sellerIds.map((sellerId) =>
          createNotificationServer({
            userId: sellerId,
            type: "delivery_confirmed",
            title: "Buyer confirmed delivery",
            message: `The buyer confirmed they received ${firstTitle}. Payout release requested.`,
            link: "/sales",
          })
        )
      );
    } catch (notifyErr) {
      console.warn("[orders.receive] Failed to notify sellers:", notifyErr);
    }

    return NextResponse.json({ ok: true, payout: "release_requested" });
  } catch (error) {
    console.error("[orders.receive] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
