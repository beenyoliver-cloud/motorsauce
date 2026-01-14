import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function normalizeAbsoluteUrl(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\/$/, "");
}

function isAbsoluteHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(String(input || "").trim());
}

function derivePublicOrigin(req: Request): string {
  // Prefer the request origin/host so Stripe returns to the same domain as the active session.
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, "");

  // Otherwise derive from host headers (common on Vercel).
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  // Fall back to configured URL if request headers are unavailable.
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSiteUrl && isAbsoluteHttpUrl(envSiteUrl)) return normalizeAbsoluteUrl(envSiteUrl);

  // Vercel provides VERCEL_URL without scheme.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Final fallback: Stripe requires absolute URLs with scheme.
  throw new Error("Public site URL is not configured (missing NEXT_PUBLIC_SITE_URL / VERCEL_URL / host headers)");
}

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
  status?: string | null;
  quantity?: number | null;
  reserved_by?: string | null;
  reserved_until?: string | null;
  reserved_offer_id?: string | null;
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

function isReservationActive(reservedUntil?: string | null) {
  if (!reservedUntil) return false;
  const ts = Date.parse(reservedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

function calcTotals(items: CheckoutItem[], shipping: "standard" | "collection") {
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = Math.max(MIN_SERVICE_FEE, Math.round(itemsSubtotal * SERVICE_FEE_RATE * 100) / 100);
  const shippingCost = shipping === "standard" && items.length > 0 ? STANDARD_SHIPPING : 0;
  const total = Number((itemsSubtotal + serviceFee + shippingCost).toFixed(2));
  return { itemsSubtotal, serviceFee, shippingCost, total };
}

type NormalizedAddress = {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeAddress(raw: any): NormalizedAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const fullName = normalizeText(raw.fullName);
  const email = normalizeText(raw.email);
  const line1 = normalizeText(raw.line1);
  const line2 = normalizeText(raw.line2);
  const city = normalizeText(raw.city);
  const postcode = normalizeText(raw.postcode);
  return {
    fullName,
    email,
    line1,
    line2: line2 || undefined,
    city,
    postcode,
  };
}

function addressValidationError(
  shipping: "standard" | "collection",
  address: NormalizedAddress | null
): string | null {
  if (!address) {
    return shipping === "collection"
      ? "Name and email are required for collection"
      : "Shipping address is required";
  }
  if (!address.fullName || !address.email) {
    return "Name and email are required";
  }
  if (shipping === "standard" && (!address.line1 || !address.city || !address.postcode)) {
    return "Full address is required for standard delivery";
  }
  return null;
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
    const address = normalizeAddress(body?.address);
    const addressError = addressValidationError(shipping, address);
    if (addressError) {
      return NextResponse.json({ error: addressError }, { status: 400 });
    }
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const normalizedItems: CheckoutItem[] = [];
    const invalidItems: Array<{ id: string; reason: string; requestedQty?: number; availableQty?: number }> = [];

    if (offerId) {
      const { data: offer, error: offerError } = await admin
        .from("offers")
        .select(
          `
            id,
            amount,
            status,
            expires_at,
            currency,
            listing_id,
            conversation_id,
            created_by_user_id,
            offered_to_user_id,
            conversation:conversation_id (buyer_user_id, seller_user_id),
            listing:listing_id (
              id,
              title,
              images,
              status,
              quantity,
              reserved_by,
              reserved_until,
              reserved_offer_id,
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
      const conversation = Array.isArray(offer.conversation) ? offer.conversation[0] : offer.conversation;
      if (conversation?.buyer_user_id && conversation.buyer_user_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized offer access" }, { status: 403 });
      }
      const offerStatus = typeof offer.status === "string" ? offer.status.toUpperCase() : "";
      if (offerStatus !== "ACCEPTED") {
        return NextResponse.json({ error: "Offer is not accepted" }, { status: 400 });
      }
      const offerExpiresAt = offer.expires_at ? Date.parse(offer.expires_at) : NaN;
      if (Number.isFinite(offerExpiresAt) && offerExpiresAt < Date.now()) {
        return NextResponse.json({ error: "Offer reservation has expired" }, { status: 409 });
      }

      const listing = offer.listing as any;
      const listingStatus = typeof listing?.status === "string" ? listing.status.toLowerCase() : "active";
      const listingQty =
        typeof listing?.quantity === "number" && Number.isFinite(listing.quantity) ? listing.quantity : 1;
      if (!listing || listingStatus !== "active") {
        return NextResponse.json({ error: "Listing is no longer available" }, { status: 400 });
      }
      if (listingQty <= 0) {
        return NextResponse.json({ error: "Listing is out of stock" }, { status: 409 });
      }
      if (isReservationActive(listing?.reserved_until)) {
        if (!listing?.reserved_by || listing.reserved_by !== user.id) {
          return NextResponse.json({ error: "Listing is reserved for another buyer" }, { status: 409 });
        }
        if (listing?.reserved_offer_id && String(listing.reserved_offer_id) !== String(offerId)) {
          return NextResponse.json({ error: "Offer reservation does not match this checkout" }, { status: 409 });
        }
      }

      const amountCents = typeof offer.amount === "number" ? offer.amount : Math.round(Number(offer.amount) || 0);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return NextResponse.json({ error: "Offer amount is invalid" }, { status: 400 });
      }
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
        price: amountCents / 100,
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

      // Some environments may not have listings.price_cents yet.
      // Attempt the modern select first, then fall back if Postgres reports undefined column (42703).
      const fullSelect = `
            id,
            title,
            price,
            price_cents,
            images,
            image_url,
            image,
            seller_id,
            status,
            quantity,
            reserved_by,
            reserved_until,
            reserved_offer_id,
            seller:profiles!seller_id (name)
          `;
      // Minimal select intended to work across older schemas.
      // (Avoids price_cents, image_url, image.)
      const fallbackSelect = `
            id,
            title,
            price,
            images,
            seller_id,
            status,
            quantity,
            reserved_by,
            reserved_until,
            reserved_offer_id,
            seller:profiles!seller_id (name)
          `;
      const minimalSelect = `
            id,
            title,
            price,
            images,
            seller_id,
            reserved_by,
            reserved_until,
            reserved_offer_id,
            seller:profiles!seller_id (name)
          `;

      let data: any[] | null = null;
      let error: any = null;

      {
        const res = await admin.from("listings").select(fullSelect).in("id", ids).limit(200);
        data = res.data as any;
        error = res.error as any;
      }

      if (error && (error as any)?.code === "42703") {
        const res2 = await admin.from("listings").select(fallbackSelect).in("id", ids).limit(200);
        data = res2.data as any;
        error = res2.error as any;
        if (error && (error as any)?.code === "42703") {
          const res3 = await admin.from("listings").select(minimalSelect).in("id", ids).limit(200);
          data = res3.data as any;
          error = res3.error as any;
        }
      }

      if (error) {
        return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
      }

      const byId = new Map((data as RawListingRow[]).map((row: any) => [String(row.id), row]));

      for (const it of items) {
        const id = String(it.id || it.listingId);
        const qty = safeQty(it.qty);
        const row = byId.get(id);
        if (!row) {
          invalidItems.push({ id, reason: "missing" });
          continue;
        }
        const status = typeof (row as any).status === "string" ? (row as any).status.toLowerCase() : "active";
        const availableQty =
          typeof (row as any).quantity === "number" && Number.isFinite((row as any).quantity)
            ? (row as any).quantity
            : null;
        if (status !== "active") {
          invalidItems.push({ id, reason: "inactive" });
          continue;
        }
        if (isReservationActive((row as any).reserved_until)) {
          invalidItems.push({ id, reason: "reserved" });
          continue;
        }
        if (availableQty !== null && availableQty < qty) {
          invalidItems.push({ id, reason: "insufficient_stock", requestedQty: qty, availableQty });
          continue;
        }
        const amount = parsePriceCents(row);
        if (amount <= 0) {
          invalidItems.push({ id, reason: "invalid_price" });
          continue;
        }
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

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: "Some items are no longer available", invalidItems },
        { status: 409 }
      );
    }

    if (!line_items.length) {
      return NextResponse.json({ error: "Nothing to pay" }, { status: 400 });
    }

    const totals = calcTotals(
      normalizedItems.map((item) => ({ ...item })),
      shipping
    );

    line_items.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(totals.serviceFee * 100),
        product_data: { name: "Service fee" },
      },
    });

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

    const origin = derivePublicOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      currency: "gbp",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout${offerId ? `?offer_id=${offerId}` : ""}`,
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
      const msg = typeof storeError?.message === "string" ? storeError.message : "";
      const m = msg.toLowerCase();

      const hint =
        m.includes("relation") && m.includes("checkout_sessions")
          ? "Missing DB table: checkout_sessions (apply SQL migration)"
          : m.includes("violates foreign key") || m.includes("foreign key")
            ? "Database constraint error (likely checkout_sessions.user_id FK points to profiles; switch FK to auth.users or ensure profiles row exists)"
            : m.includes("violates not-null") || m.includes("null value")
              ? "Database constraint error (missing required field)"
              : "Database error";
      return NextResponse.json(
        {
          error: "DB error",
          hint,
          code: (storeError as any)?.code ?? null,
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
