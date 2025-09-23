// src/app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
// Use the helper you already have. If yours is in supabaseServer.ts, change the import accordingly.
import { supabaseServer } from "@/lib/supabase"; // or: import { supabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function mapRow(row: any) {
  const price = "£" + (row.price_cents / 100).toFixed(2);
  const images = Array.isArray(row.listing_images)
    ? row.listing_images
        .slice()
        .sort((a: any, b: any) => (a.idx ?? 0) - (b.idx ?? 0))
        .map((i: any) => i.url)
    : [];
  return {
    id: row.id,
    title: row.title,
    price,
    image: images[0] || "/images/placeholder.png",
    images,
    category: row.category,
    condition: row.condition || "Used - Good",
    make: row.make || undefined,
    model: row.model || undefined,
    genCode: row.gen_code || undefined,
    engine: row.engine || undefined,
    year: row.year || undefined,
    oem: row.oem || undefined,
    description: row.description || "",
    createdAt: row.created_at,
    seller: {
      name: row.seller?.display_name || "Seller",
      avatar: row.seller?.avatar_url || "/images/avatar-placeholder.png",
      rating: row.seller?.rating ?? 5.0,
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Choose the client you set up earlier
  const sb = supabaseServer?.() ?? (undefined as any);

  if (id) {
    const { data, error } = await sb
      .from("listings")
      .select(`
        id, title, price_cents, category, condition, make, model, gen_code, engine, year, oem, description, created_at,
        seller:profiles!listings_seller_id_fkey ( id, display_name, avatar_url, rating ),
        listing_images ( url, idx )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(mapRow(data));
  }

  const { data, error } = await sb
    .from("listings")
    .select(`
      id, title, price_cents, category, condition, created_at, make, model, gen_code, engine, year, oem, description,
      seller:profiles!listings_seller_id_fkey ( display_name, avatar_url, rating ),
      listing_images ( url, idx )
    `)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(mapRow));
}
