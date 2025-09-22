import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

/** Don’t cache; keep it simple for now */
export const dynamic = "force-dynamic";

type Listing = {
  id: string | number;
  title: string;
  price: string; // "£123.45"
  image: string;
  images?: string[];
  category: "OEM" | "Aftermarket" | "Tool";
  condition: "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  oem?: string;
  description?: string;
  createdAt: string;
  seller: { name: string; avatar: string; rating: number };
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
};

/** Helper: format £ from cents or accept preformatted */
function toGBP(row: any): string {
  if (typeof row?.price_cents === "number") {
    return "£" + (row.price_cents / 100).toFixed(2);
  }
  if (typeof row?.price === "number") {
    return "£" + Number(row.price).toFixed(2);
  }
  if (typeof row?.price === "string") {
    return row.price.startsWith("£") ? row.price : `£${row.price}`;
  }
  return "£0.00";
}

/** Map a DB row into the Listing shape your UI expects */
function mapDbRow(row: any): Listing {
  const images: string[] =
    Array.isArray(row?.images) && row.images.length
      ? row.images
      : row?.image_url
      ? [row.image_url]
      : row?.image
      ? [row.image]
      : [];

  const seller =
    row?.seller && typeof row.seller === "object"
      ? row.seller
      : {
          name: row?.seller_name || "Seller",
          avatar: row?.seller_avatar || "/images/seller1.jpg",
          rating: Number(row?.seller_rating ?? 5),
        };

  return {
    id: row.id,
    title: row.title,
    price: toGBP(row),
    image: images[0] || "/images/placeholder.jpg",
    images,
    category: row.category || "OEM",
    condition: row.condition || "Used - Good",
    make: row.make ?? undefined,
    model: row.model ?? undefined,
    genCode: row.gen_code ?? row.genCode ?? undefined,
    engine: row.engine ?? undefined,
    year: row.year ? Number(row.year) : undefined,
    oem: row.oem ?? undefined,
    description: row.description ?? "",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    seller,
    vin: row.vin ?? undefined,
    yearFrom: row.year_from ?? undefined,
    yearTo: row.year_to ?? undefined,
  };
}

/** Fallback to the local sample data if nothing in DB yet */
async function findInLocal(id?: string | null) {
  try {
    const { listings } = await import("@/data/listings");
    if (id) {
      return listings.find((l: any) => String(l.id) === String(id)) || null;
    }
    return listings;
  } catch {
    return id ? null : [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // If an ID is provided, return a single listing
  if (id) {
    // Try DB first
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      // Log on server, but don’t leak details to client
      console.error("DB error fetching listing", id, error);
    }

    if (data) {
      return NextResponse.json(mapDbRow(data), { status: 200 });
    }

    // Fallback to local seed data
    const local = await findInLocal(id);
    if (local) return NextResponse.json(local, { status: 200 });

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Otherwise, return a (small) list for now
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("DB error listing listings", error);
  }

  const rows = Array.isArray(data) && data.length ? data.map(mapDbRow) : await findInLocal(null);
  return NextResponse.json(rows, { status: 200 });
}
