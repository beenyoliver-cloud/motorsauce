import { NextResponse } from "next/server";
import { finalizeCheckoutSession } from "@/lib/checkoutServer";

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

    const result = await finalizeCheckoutSession({
      sessionId,
      includeAddress: false,
    });

    switch (result.state) {
      case "ok":
        return NextResponse.json({ ...result.summary, reused: result.reused });
      case "forbidden":
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      case "not_found":
        return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
      case "not_paid":
        return NextResponse.json({ error: "Payment not completed yet" }, { status: 409 });
      case "processing":
        return NextResponse.json(
          { error: "Checkout processing", retryAfterMs: result.retryAfterMs },
          { status: 202 }
        );
      case "error":
      default:
        return NextResponse.json({ error: result.error || "Failed to finalize checkout" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[checkout/lookup] Error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected" }, { status: 500 });
  }
}
