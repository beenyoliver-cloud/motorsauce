import { NextResponse } from "next/server";
import Stripe from "stripe";
import { finalizeCheckoutSession } from "@/lib/checkoutServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[checkout/webhook] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    if (!sessionId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const result = await finalizeCheckoutSession({
      sessionId,
      includeAddress: false,
    });

    if (result.state === "error" || result.state === "not_paid" || result.state === "forbidden") {
      console.error("[checkout/webhook] Finalize failed", result);
      return NextResponse.json({ error: "Failed to finalize checkout" }, { status: 500 });
    }

    if (result.state === "not_found") {
      console.warn("[checkout/webhook] Checkout session not found", sessionId);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
