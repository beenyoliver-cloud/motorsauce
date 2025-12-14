import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")).replace(/\/$/, "");

function parsePriceCents(row: any): number {
  if (typeof row?.price_cents === "number") return row.price_cents;
  if (typeof row?.price === "number") return Math.round(row.price * 100);
  if (typeof row?.price === "string") {
    const n = Number(String(row.price).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }
  return 0;
}

function safeQty(q: unknown): number { const n = Math.floor(Number(q || 1)); return Math.max(1, Math.min(99, Number.isFinite(n) ? n : 1)); }

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" as any });

  try {
    const body = await req.json().catch(() => ({} as any));
    const shipping = body?.shipping === "collection" ? "collection" : "standard";
    const offerId = body?.offer_id;
    
    const supabase = supabaseServerAnon;
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let listingIds: string[] = [];
    
    // Handle offer-based checkout
    if (offerId) {
      // Fetch the offer with listing details
      const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(`
          id,
          amount,
          status,
          starter,
          listing_id,
          listings:listing_id (
            id,
            title,
            images,
            status
          )
        `)
        .eq("id", offerId)
        .single();
      
      if (offerError || !offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      
      if (offer.status !== "accepted") {
        return NextResponse.json({ error: "Offer is not accepted" }, { status: 400 });
      }
      
      const listing = offer.listings as any;
      if (!listing || listing.status !== "active") {
        return NextResponse.json({ error: "Listing is no longer available" }, { status: 400 });
      }
      
      // Use the offer amount (stored as decimal in DB)
      const amountCents = Math.round(offer.amount * 100);
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
      
      listingIds = [listing.id];
    } else {
      // Handle cart-based checkout
      const items = Array.isArray(body?.items) ? body.items : [];
      
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "No items" }, { status: 400 });
      }

      const ids = Array.from(new Set(items.map((it: any) => String(it.id || it.listingId || "").trim()).filter(Boolean)));
      if (!ids.length) return NextResponse.json({ error: "Invalid items" }, { status: 400 });

      const { data, error } = await supabase.from("listings").select("*").in("id", ids).limit(200);
      if (error) {
        return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
      }
      const rows = Array.isArray(data) ? data : [];

      // Map id -> row for validation
      const byId = new Map(rows.map((r: any) => [String(r.id), r]));

      for (const it of items) {
        const id = String(it.id || it.listingId);
        const qty = safeQty(it.qty);
        const row = byId.get(id);
        if (!row) continue; // skip unknown ids silently
        const amount = parsePriceCents(row);
        if (amount <= 0) continue;
        const name = row.title || `Listing ${id}`;
        const image = Array.isArray(row.images) && row.images.length ? row.images[0] : (row.image_url || row.image || null);
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
      }
      
      listingIds = ids;
    }

    if (line_items.length === 0) return NextResponse.json({ error: "Nothing to pay" }, { status: 400 });

    // Shipping as separate line if standard
    if (shipping === "standard") {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: 499,
          product_data: { name: "Standard delivery" },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      currency: "gbp",
      success_url: SITE_URL ? `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}` : `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: SITE_URL ? `${SITE_URL}/checkout${offerId ? `?offer_id=${offerId}` : ''}` : `${req.headers.get("origin")}/checkout`,
      metadata: {
        // minimal breadcrumbs; do not trust on server without verification
        listing_ids: listingIds.join(","),
        offer_id: offerId || "",
        shipping,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected" }, { status: 500 });
  }
}
