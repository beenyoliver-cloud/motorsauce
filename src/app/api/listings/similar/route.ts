// src/app/api/listings/similar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    if (!listingId) {
      return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Fetch the current listing to get its attributes
    const { data: currentListing, error: currentError } = await supabase
      .from("listings")
      .select("category, make, model, gen_code, engine, seller_id")
      .eq("id", listingId)
      .single();

    if (currentError || !currentListing) {
      return NextResponse.json({ similar: [] }, { status: 200 });
    }

    // Build a query for similar listings
    // Priority: same make+model > same make > same category
    // Exclude the current listing and sold items
    let query = supabase
      .from("listings")
      .select("id, title, price_cents, images, image_url, image, category, make, model, condition, seller_id")
      .neq("id", listingId)
      .neq("status", "sold")
      .limit(limit * 3); // Fetch more to filter down

    // Try to match make and model first
    if (currentListing.make) {
      query = query.eq("make", currentListing.make);
      if (currentListing.model) {
        query = query.eq("model", currentListing.model);
      }
    } else if (currentListing.category) {
      // Fallback to same category
      query = query.eq("category", currentListing.category);
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error("[similar listings API] Error:", error);
      return NextResponse.json({ similar: [] }, { status: 200 });
    }

    // Prioritize: same make+model, then same make, then same category, exclude own listings
    const scored = (listings || []).map((l: any) => {
      let score = 0;
      if (l.make === currentListing.make) score += 10;
      if (l.model === currentListing.model) score += 5;
      if (l.category === currentListing.category) score += 2;
      if (l.seller_id === currentListing.seller_id) score -= 3; // De-prioritize same seller
      return { ...l, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, limit);

    // Map to consistent format
    const similar = topResults.map((l: any) => {
      const images: string[] = Array.isArray(l.images) && l.images.length
        ? l.images
        : l.image_url
        ? [l.image_url]
        : l.image
        ? [l.image]
        : [];

      return {
        id: l.id,
        title: l.title,
        price: typeof l.price_cents === "number"
          ? `£${(l.price_cents / 100).toFixed(2)}`
          : "£0.00",
        image: images[0] || "/images/placeholder.jpg",
        category: l.category || "OEM",
        make: l.make || undefined,
        model: l.model || undefined,
        condition: l.condition || "Used - Good",
      };
    });

    return NextResponse.json({ similar }, { status: 200 });
  } catch (error: any) {
    console.error("[similar listings API] Unexpected error:", error);
    return NextResponse.json({ similar: [] }, { status: 200 });
  }
}
