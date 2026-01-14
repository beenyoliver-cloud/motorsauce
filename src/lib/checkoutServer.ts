import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";
import { createOrderRecord } from "@/lib/ordersServer";

type CheckoutPayload = {
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
  shipping_address: {
    fullName: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
  } | null;
  offer_id?: string | null;
  totals: {
    itemsSubtotal: number;
    serviceFee: number;
    shippingCost: number;
    total: number;
  };
};

type CheckoutRow = {
  session_id: string;
  user_id: string;
  payload: CheckoutPayload;
  consumed_at: string | null;
  order_id: string | null;
};

type CheckoutSummary = {
  orderId: string;
  orderRef: string;
  items: CheckoutPayload["items"];
  totals: CheckoutPayload["totals"];
  shippingMethod: CheckoutPayload["shipping_method"];
  shippingAddress?: CheckoutPayload["shipping_address"] | null;
};

type FinalizeResult =
  | { state: "ok"; summary: CheckoutSummary; reused: boolean }
  | { state: "forbidden" }
  | { state: "not_found" }
  | { state: "not_paid" }
  | { state: "processing"; retryAfterMs: number }
  | { state: "error"; error: string };

function formatOrderRef(orderId: string) {
  return `MS-${String(orderId).split("-")[0].toUpperCase()}`;
}

async function syncInventory(admin: ReturnType<typeof supabaseServer>, items: CheckoutPayload["items"]) {
  for (const item of items) {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity || 1))));
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id, quantity, status")
      .eq("id", item.listing_id)
      .maybeSingle();

    if (listingErr || !listing) continue;

    const currentQty = typeof (listing as any).quantity === "number" ? (listing as any).quantity : 1;
    const nextQty = Math.max(0, currentQty - qty);
    const update: any = { quantity: nextQty };

    if (nextQty <= 0) {
      update.status = "sold";
      update.marked_sold_at = new Date().toISOString();
    } else {
      update.status = (listing as any).status === "sold" ? "active" : (listing as any).status || "active";
    }

    await admin.from("listings").update(update).eq("id", item.listing_id);
  }
}

async function markOfferCompleted(admin: ReturnType<typeof supabaseServer>, offerId?: string | null) {
  if (!offerId) return;
  try {
    await admin
      .from("offers")
      .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
      .eq("id", offerId)
      .eq("status", "ACCEPTED");
  } catch (err) {
    console.warn("[checkout] Offer completion update failed:", err);
  }
}

function buildSummary(row: CheckoutRow, orderId: string, orderRef: string, includeAddress: boolean): CheckoutSummary {
  const summary: CheckoutSummary = {
    orderId,
    orderRef,
    items: row.payload.items,
    totals: row.payload.totals,
    shippingMethod: row.payload.shipping_method,
  };
  if (includeAddress) {
    summary.shippingAddress = row.payload.shipping_address || null;
  }
  return summary;
}

export async function finalizeCheckoutSession(opts: {
  sessionId: string;
  expectedUserId?: string;
  includeAddress: boolean;
}): Promise<FinalizeResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { state: "error", error: "Payments not configured" };
  }

  const admin = supabaseServer({ useServiceRole: true });
  const { data: stored, error: lookupError } = await admin
    .from("checkout_sessions")
    .select("*")
    .eq("session_id", opts.sessionId)
    .maybeSingle();

  if (lookupError) {
    return { state: "error", error: "Checkout session lookup failed" };
  }

  if (!stored) {
    return { state: "not_found" };
  }

  const row = stored as CheckoutRow;
  if (opts.expectedUserId && row.user_id !== opts.expectedUserId) {
    return { state: "forbidden" };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });
  const session = await stripe.checkout.sessions.retrieve(opts.sessionId);
  if (session.payment_status !== "paid") {
    return { state: "not_paid" };
  }

  if (row.order_id && row.consumed_at) {
    const orderRef = formatOrderRef(row.order_id);
    return {
      state: "ok",
      summary: buildSummary(row, row.order_id, orderRef, opts.includeAddress),
      reused: true,
    };
  }

  if (row.consumed_at && !row.order_id) {
    return { state: "processing", retryAfterMs: 1500 };
  }

  const lockTimestamp = new Date().toISOString();
  const { data: lockRows, error: lockError } = await admin
    .from("checkout_sessions")
    .update({ consumed_at: lockTimestamp })
    .eq("session_id", opts.sessionId)
    .is("consumed_at", null)
    .select("session_id");

  if (lockError) {
    return { state: "error", error: "Failed to lock checkout session" };
  }

  if (!lockRows || lockRows.length === 0) {
    const { data: latest } = await admin
      .from("checkout_sessions")
      .select("order_id, consumed_at, payload")
      .eq("session_id", opts.sessionId)
      .maybeSingle();
    if (latest?.order_id) {
      const orderRef = formatOrderRef(latest.order_id);
      const latestRow = { ...row, order_id: latest.order_id } as CheckoutRow;
      return {
        state: "ok",
        summary: buildSummary(latestRow, latest.order_id, orderRef, opts.includeAddress),
        reused: true,
      };
    }
    return { state: "processing", retryAfterMs: 1500 };
  }

  try {
    const { orderId, orderRef } = await createOrderRecord({
      userId: row.user_id,
      items: row.payload.items,
      shippingMethod: row.payload.shipping_method,
      shippingAddress: row.payload.shipping_address,
      totals: row.payload.totals,
    });

    try {
      await syncInventory(admin, row.payload.items);
    } catch (err) {
      console.warn("[checkout] Stock decrement failed", err);
    }

    await markOfferCompleted(admin, row.payload.offer_id);

    await admin
      .from("checkout_sessions")
      .update({ consumed_at: lockTimestamp, order_id: orderId })
      .eq("session_id", opts.sessionId);

    return {
      state: "ok",
      summary: buildSummary(row, orderId, orderRef, opts.includeAddress),
      reused: false,
    };
  } catch (error: any) {
    await admin
      .from("checkout_sessions")
      .update({ consumed_at: null })
      .eq("session_id", opts.sessionId)
      .eq("consumed_at", lockTimestamp)
      .is("order_id", null);
    return { state: "error", error: error?.message || "Failed to create order" };
  }
}
