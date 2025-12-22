import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";
import { createOrderRecord } from "@/lib/ordersServer";

export const dynamic = "force-dynamic";

type CheckoutRow = {
  session_id: string;
  user_id: string;
  payload: {
    items: Array<{
      listing_id: string;
      title: string;
      price: number;
      quantity: number;
      seller_id?: string | null;
      seller_name?: string | null;
      image?: string | null;
    }>;
    shipping_method: "standard" | "collection";
    shipping_address: any;
    offer_id?: string | null;
    totals: {
      itemsSubtotal: number;
      serviceFee: number;
      shippingCost: number;
      total: number;
    };
  };
  consumed_at: string | null;
  order_id: string | null;
};

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer({ authHeader });
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  if (authError || !userResult?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = userResult.user;

  const { session_id: sessionId } = await req.json().catch(() => ({ session_id: null }));
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const admin = supabaseServer({ useServiceRole: true });
  const { data: stored, error: lookupError } = await admin
    .from("checkout_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (lookupError) {
    console.error("[checkout/complete] Lookup error:", lookupError);
    return NextResponse.json({ error: "Checkout session lookup failed" }, { status: 500 });
  }

  if (!stored) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }

  const row = stored as CheckoutRow;
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (row.order_id && row.consumed_at) {
    return NextResponse.json({ orderId: row.order_id, reused: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed yet" }, { status: 409 });
  }
  if (session.metadata?.buyer_id && session.metadata?.buyer_id !== user.id) {
    return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
  }

  try {
    const { orderId, orderRef } = await createOrderRecord({
      userId: user.id,
      items: row.payload.items,
      shippingMethod: row.payload.shipping_method,
      shippingAddress: row.payload.shipping_address,
      totals: row.payload.totals,
    });

    // Decrement listing stock and mark sold when stock reaches 0.
    // Run only on first consumption to keep this endpoint idempotent.
    // Note: We intentionally fail-open here (order is the source of truth).
    try {
      for (const item of row.payload.items) {
        const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity || 1))));
        const { data: listing, error: listingErr } = await admin
          .from("listings")
          .select("id, quantity, status")
          .eq("id", item.listing_id)
          .maybeSingle();

        if (listingErr || !listing) continue;

        const currentQty = typeof (listing as any).quantity === "number" ? (listing as any).quantity : 1;
        const nextQty = Math.max(0, currentQty - qty);
        const nextStatus = nextQty <= 0 ? "sold" : (listing as any).status || "active";

        const update: any = { quantity: nextQty };
        if (nextQty <= 0) {
          update.status = "sold";
          update.marked_sold_at = new Date().toISOString();
        } else if (nextStatus !== "sold") {
          // keep as active if it wasn't sold
          update.status = "active";
        }

        await admin.from("listings").update(update).eq("id", item.listing_id);
      }
    } catch (e) {
      console.warn("[checkout/complete] Stock decrement failed", e);
    }

    await admin
      .from("checkout_sessions")
      .update({ consumed_at: new Date().toISOString(), order_id: orderId })
      .eq("session_id", sessionId);

    return NextResponse.json({
      orderId,
      orderRef,
      items: row.payload.items,
      totals: row.payload.totals,
      shippingMethod: row.payload.shipping_method,
      shippingAddress: row.payload.shipping_address,
    });
  } catch (error: any) {
    console.error("[checkout/complete] Failed to create order:", error);
    return NextResponse.json({ error: error?.message || "Failed to create order" }, { status: 500 });
  }
}
