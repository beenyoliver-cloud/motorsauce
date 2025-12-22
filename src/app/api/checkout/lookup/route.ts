import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";
import { createOrderRecord } from "@/lib/ordersServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/checkout/lookup?session_id=cs_...
 *
 * Purpose:
 * - Make the checkout success page reliable even if the browser session is missing
 *   immediately after the Stripe redirect.
 *
 * Security model:
 * - We verify the Stripe session is paid.
 * - We ONLY return a limited order summary (no shipping address).
 * - We rely on the stored checkout_sessions payload to build the summary.
 */
export async function GET(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const admin = supabaseServer({ useServiceRole: true });

    const { data: stored, error: lookupError } = await admin
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (lookupError) {
      console.error("[checkout/lookup] Lookup error:", lookupError);
      return NextResponse.json({ error: "Checkout session lookup failed" }, { status: 500 });
    }

    if (!stored) {
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed yet" }, { status: 409 });
    }

    // If already consumed, return the existing order summary.
    if ((stored as any).order_id && (stored as any).consumed_at) {
      return NextResponse.json({
        orderId: (stored as any).order_id,
        reused: true,
        orderRef: `MS-${String((stored as any).order_id).split("-")[0].toUpperCase()}`,
        items: (stored as any).payload?.items || [],
        totals: (stored as any).payload?.totals || null,
        shippingMethod: (stored as any).payload?.shipping_method || null,
        // Intentionally omit shippingAddress here for now (avoid leaking personal data).
      });
    }

    // Not consumed yet: create order now (same core logic as /api/checkout/complete, but without requiring user auth).
    const payload = (stored as any).payload;
    const userId = (stored as any).user_id;

    if (!payload || !userId) {
      return NextResponse.json({ error: "Invalid stored checkout payload" }, { status: 500 });
    }

    const { orderId, orderRef } = await createOrderRecord({
      userId,
      items: payload.items,
      shippingMethod: payload.shipping_method,
      shippingAddress: payload.shipping_address,
      totals: payload.totals,
    });

    // Mark checkout session consumed.
    await admin
      .from("checkout_sessions")
      .update({ consumed_at: new Date().toISOString(), order_id: orderId })
      .eq("session_id", sessionId);

    return NextResponse.json({
      orderId,
      orderRef,
      items: payload.items,
      totals: payload.totals,
      shippingMethod: payload.shipping_method,
    });
  } catch (err: any) {
    console.error("[checkout/lookup] Error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected" }, { status: 500 });
  }
}
