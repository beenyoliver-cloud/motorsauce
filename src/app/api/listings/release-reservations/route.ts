import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReservationRow = {
  id: string;
  title?: string | null;
  seller_id?: string | null;
  reserved_by?: string | null;
  reserved_offer_id?: string | null;
  reserved_until?: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("cron_secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseServer({ useServiceRole: true });
  const now = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("listings")
    .select("id, title, seller_id, reserved_by, reserved_offer_id, reserved_until")
    .lte("reserved_until", now)
    .not("reserved_until", "is", null)
    .eq("status", "active");

  if (error) {
    console.error("[release-reservations] Query error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }

  const rows = (expired || []) as ReservationRow[];
  if (rows.length === 0) {
    return NextResponse.json({ released: 0, expiredOffers: 0 });
  }

  const listingIds = rows.map((row) => row.id);
  const offerIds = rows.map((row) => row.reserved_offer_id).filter(Boolean) as string[];

  const { error: clearError } = await admin
    .from("listings")
    .update({
      reserved_by: null,
      reserved_offer_id: null,
      reserved_until: null,
      reserved_at: null,
    })
    .in("id", listingIds);

  if (clearError) {
    console.error("[release-reservations] Failed to clear reservations:", clearError);
    return NextResponse.json({ error: "Failed to clear reservations" }, { status: 500 });
  }

  let expiredOffers = 0;
  if (offerIds.length > 0) {
    const { data: updatedOffers, error: offerError } = await admin
      .from("offers")
      .update({ status: "EXPIRED", updated_at: now, expires_at: now })
      .in("id", offerIds)
      .eq("status", "ACCEPTED")
      .select("id");

    if (offerError) {
      console.error("[release-reservations] Failed to expire offers:", offerError);
    } else {
      expiredOffers = (updatedOffers || []).length;
    }
  }

  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    read: boolean;
    created_at: string;
  }> = [];

  for (const row of rows) {
    const listingLabel = row.title ? `"${row.title}"` : "this listing";
    if (row.reserved_by) {
      notifications.push({
        user_id: row.reserved_by,
        type: "offer_expired",
        title: "Offer expired",
        message: `Your 12-hour reservation for ${listingLabel} has expired. The listing is back on sale.`,
        link: row.id ? `/listing/${row.id}` : null,
        read: false,
        created_at: now,
      });
    }
    if (row.seller_id) {
      notifications.push({
        user_id: row.seller_id,
        type: "reservation_expired",
        title: "Reservation expired",
        message: `The reservation window for ${listingLabel} expired. The listing is back on sale.`,
        link: row.id ? `/listing/${row.id}` : null,
        read: false,
        created_at: now,
      });
    }
  }

  if (notifications.length > 0) {
    const { error: notifyError } = await admin.from("notifications").insert(notifications);
    if (notifyError) {
      console.error("[release-reservations] Failed to create notifications:", notifyError);
    }
  }

  return NextResponse.json({ released: rows.length, expiredOffers });
}
