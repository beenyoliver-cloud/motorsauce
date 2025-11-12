import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const sb = supabaseServer();

type AdminListingRow = {
  id: string | number;
  title: string;
  price_cents?: number | null;
  price?: number | string | null;
  image_url?: string | null;
  image?: string | null;
  make?: string | null;
  model?: string | null;
  created_at?: string | null;
};

function toPrice(row: AdminListingRow) {
  if (typeof row?.price_cents === "number") return "£" + (row.price_cents / 100).toFixed(2);
  if (typeof row?.price === "number") return "£" + Number(row.price).toFixed(2);
  if (typeof row?.price === "string") return row.price.startsWith("£") ? row.price : `£${row.price}`;
  return "£0.00";
}

function mapRow(row: AdminListingRow) {
  return {
    id: row.id,
    title: row.title,
    price: toPrice(row),
    image: row.image_url || row.image || "/images/placeholder.jpg",
    make: row.make,
    model: row.model,
    created_at: row.created_at,
  };
}

export async function GET() {
  try {
    const { data, error } = await sb.from("listings").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) {
      console.error("admin listings fetch", error);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(((data as AdminListingRow[]) || []).map(mapRow));
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const { error } = await sb.from("listings").delete().eq("id", id);
    if (error) {
      console.error("admin delete", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || !body.title) return NextResponse.json({ error: "missing title" }, { status: 400 });
    const payload: Partial<AdminListingRow> = {
      title: body.title,
      price: body.price,
      image_url: body.image_url,
      make: body.make,
      model: body.model,
    };
    const { data, error } = await sb.from("listings").upsert(payload, { onConflict: "id" }).select().maybeSingle();
    if (error) {
      console.error("admin upsert", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || null);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
