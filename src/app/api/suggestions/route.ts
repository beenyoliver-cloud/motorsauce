import { NextResponse } from "next/server";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Use anon key server client to respect RLS
const supabase = supabaseServerAnon;

type ListingRow = {
  id: string | number;
  title: string;
  price_cents?: number | null;
  price?: number | string | null;
  image_url?: string | null;
  image?: string | null;
  images?: string[] | null;
  make?: string | null;
  model?: string | null;
  created_at?: string | null;
};

type GarageCar = { make?: string; model?: string };

function toPrice(row: ListingRow): string {
  if (typeof row?.price_cents === "number") return "£" + (row.price_cents / 100).toFixed(2);
  if (typeof row?.price === "number") return "£" + Number(row.price).toFixed(2);
  if (typeof row?.price === "string") return row.price.startsWith("£") ? row.price : `£${row.price}`;
  return "£0.00";
}

function mapRow(row: ListingRow) {
  const images = Array.isArray(row?.images) && row.images.length ? row.images : row?.image_url ? [row.image_url] : row?.image ? [row.image] : [];
  return {
    id: row.id,
    title: row.title,
    price: toPrice(row),
    image: images[0] || "/images/placeholder.jpg",
  };
}

export async function POST(req: Request) {
  try {
  const body = await req.json().catch(() => ({} as { garage?: unknown; searches?: unknown }));
  const garage: GarageCar[] = Array.isArray(body?.garage) ? (body.garage as GarageCar[]) : [];
    const searches: string[] = Array.isArray(body?.searches) ? body.searches : [];

  const results = new Map<string | number, ListingRow>();

    // Gather makes/models from garage
    const makes = Array.from(new Set(garage.map((c) => (c.make || "").trim()).filter(Boolean)));
    const models = Array.from(new Set(garage.map((c) => (c.model || "").trim()).filter(Boolean)));

    // Query by make
    if (makes.length) {
  const { data, error } = await supabase.from("listings").select("*").in("make", makes).limit(50);
  if (!error && Array.isArray(data)) for (const r of (data as ListingRow[])) results.set(String(r.id), r);
    }

    // Query by model
    if (models.length) {
  const { data, error } = await supabase.from("listings").select("*").in("model", models).limit(50);
  if (!error && Array.isArray(data)) for (const r of (data as ListingRow[])) results.set(String(r.id), r);
    }

    // Query by recent searches (title match)
    for (const term of searches.slice(0, 5)) {
      if (!term || typeof term !== "string") continue;
      const q = `%${term.replace(/%/g, "\\%").trim()}%`;
  const { data, error } = await supabase.from("listings").select("*").ilike("title", q).limit(20);
  if (!error && Array.isArray(data)) for (const r of (data as ListingRow[])) results.set(String(r.id), r);
    }

    // If nothing found yet, return most recent uploads (so the section isn't empty)
    if (!results.size) {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(12);
  if (!error && Array.isArray(data)) for (const r of (data as ListingRow[])) results.set(String(r.id), r);
    }

    const out = Array.from(results.values()).slice(0, 24).map(mapRow);
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("Suggestions error", err);
    return NextResponse.json([], { status: 200 });
  }
}
