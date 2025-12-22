import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")).replace(/\/$/, "");

type RawListingRow = {
  id: string;
  title: string;
  price_cents?: number | null;
  price?: number | string | null;
  images?: string[] | null;
  image_url?: string | null;
  image?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
};

type CheckoutItem = {
  listing_id: string;
  title: string;
  price: number;
  quantity: number;
  seller_id: string | null;
  seller_name?: string | null;
  image?: string | null;
};

type CheckoutSnapshot = {
  items: CheckoutItem[];
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

const SERVICE_FEE_RATE = 0.025;
const MIN_SERVICE_FEE = 0.5;
const STANDARD_SHIPPING = 4.99;

function parsePriceCents(row: RawListingRow): number {
  if (typeof row?.price_cents === "number") return row.price_cents;
  if (typeof row?.price === "number") return Math.round(row.price * 100);
  if (typeof row?.price === "string") {
    const n = Number(String(row.price).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }
  return 0;
}

function safeQty(q: unknown): number {
  const n = Math.floor(Number(q || 1));
  return Math.max(1, Math.min(99, Number.isFinite(n) ? n : 1));
}

function calcTotals(items: CheckoutItem[], shipping: "standard" | "collection") {
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = Math.max(MIN_SERVICE_FEE, Math.round(itemsSubtotal * SERVICE_FEE_RATE * 100) / 100);
  const shippingCost = shipping === "standard" && items.length > 0 ? STANDARD_SHIPPING : 0;
  const total = Number((itemsSubtotal + serviceFee + shippingCost).toFixed(2));
  return { itemsSubtotal, serviceFee, shippingCost, total };
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
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

  const admin = supabaseServer({ useServiceRole: true });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });

  try {
    const body = await req.json().catch(() => ({} as any));
    const shipping: "standard" | "collection" = body?.shipping === "collection" ? "collection" : "standard";
    const offerId = body?.offer_id ?? null;
    const address = body?.address && typeof body.address === "object" ? body.address : null;
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const normalizedItems: CheckoutItem[] = [];

    if (offerId) {
      const { data: offer, error: offerError } = await admin
        .from("offers")
        .select(
          `
            id,
            amount,
            status,
            starter,
            listing_id,
            listings:listing_id (
              id,
              title,
              images,
              status,
              seller_id,
              seller:profiles!seller_id (name)
            )
          `
        )
        .eq("id", offerId)
        .single();

      if (offerError || !offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      if (offer.starter !== user.id) {
        return NextResponse.json({ error: "Unauthorized offer access" }, { status: 403 });
      }
      if (offer.status !== "accepted") {
        return NextResponse.json({ error: "Offer is not accepted" }, { status: 400 });
      }

      const listing = offer.listings as any;
      if (!listing || listing.status !== "active") {
        return NextResponse.json({ error: "Listing is no longer available" }, { status: 400 });
      }

      const amountCents = Math.round(Number(offer.amount) * 100);
      const image = Array.isArray(listing.images) && listing.images.length ? listing.images[0] : null;

      line_items.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: amountCents,
          product_data: {
            name: listing.title,
            description: "Accepted offer price",
            images: image ? [image] : undefined,
            metadata: { listing_id: listing.id, offer_id: offerId },
          },
        },
      });

      normalizedItems.push({
        listing_id: listing.id,
        title: listing.title,
        price: Number(offer.amount),
        quantity: 1,
        seller_id: listing.seller_id || null,
        seller_name: listing.seller?.name || null,
        image,
      });
    } else {
      const items = Array.isArray(body?.items) ? body.items : [];
      if (!items.length) {
        return NextResponse.json({ error: "No items" }, { status: 400 });
      }

      const ids = Array.from(
        new Set(items.map((it: any) => String(it.id || it.listingId || "").trim()).filter(Boolean))
      );
      if (!ids.length) {
        return NextResponse.json({ error: "Invalid items" }, { status: 400 });
      }

      const { data, error } = await admin
        .from("listings")
        .select(
          `
            id,
            title,
            price,
            price_cents,
            images,
            image_url,
            image,
            seller_id,
            seller:profiles!seller_id (name)
          `
        )
        .in("id", ids)
        .limit(200);
      if (error) {
        return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
      }

      const byId = new Map((data as RawListingRow[]).map((row: any) => [String(row.id), row]));

      for (const it of items) {
        const id = String(it.id || it.listingId);
        const qty = safeQty(it.qty);
        const row = byId.get(id);
        if (!row) continue;
        const amount = parsePriceCents(row);
        if (amount <= 0) continue;
        const perUnit = amount / 100;
        const name = row.title || `Listing ${id}`;
        const image =
          (Array.isArray(row.images) && row.images.length && row.images[0]) ||
          row.image_url ||
          row.image ||
          null;

        line_items.push({
          quantity: qty,
          price_data: {
            currency: "gbp",
            unit_amount: amount,
            product_data: {
              name,
              images: image ? [image] : undefined,
              metadata: { listing_id: id },
            },
          },
        });

        normalizedItems.push({
          listing_id: id,
          title: name,
          price: perUnit,
          quantity: qty,
          seller_id: row.seller_id || null,
          seller_name: (row as any).seller?.name || null,
          image,
        });
      }
    }

    if (!line_items.length) {
      return NextResponse.json({ error: "Nothing to pay" }, { status: 400 });
    }

    if (shipping === "standard") {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(STANDARD_SHIPPING * 100),
          product_data: { name: "Standard delivery" },
        },
      });
    }

    const totals = calcTotals(
      normalizedItems.map((item) => ({ ...item })),
      shipping
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      currency: "gbp",
      success_url: SITE_URL
        ? `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
        : `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: SITE_URL
        ? `${SITE_URL}/checkout${offerId ? `?offer_id=${offerId}` : ""}`
        : `${req.headers.get("origin")}/checkout`,
      metadata: {
        buyer_id: user.id,
        offer_id: offerId || "",
        shipping,
      },
    });

    const snapshot: CheckoutSnapshot = {
      items: normalizedItems,
      shipping_method: shipping,
      shipping_address: address,
      offer_id: offerId,
      totals,
    };

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
    const { error: storeError } = await admin.from("checkout_sessions").upsert({
      session_id: session.id,
      user_id: user.id,
      payload: snapshot as unknown as Record<string, unknown>,
      expires_at: expiresAt,
      consumed_at: null,
      order_id: null,
    });

    if (storeError) {
      console.error("[checkout/session] Failed to store session snapshot", storeError);
      // Most common causes:
      // - checkout_sessions table missing (migration not applied)
      // - foreign key failure (profiles row missing for user_id)
      // - RLS/policy issues (should be bypassed with service role)
      const hint =
        typeof storeError?.message === "string" && storeError.message.toLowerCase().includes("checkout_sessions")
          ? "Missing DB table: checkout_sessions (apply SQL migration)"
          : "Database error";
      return NextResponse.json(
        {
          error: "DB error",
          hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[checkout/session] Error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected" }, { status: 500 });
  }
}
