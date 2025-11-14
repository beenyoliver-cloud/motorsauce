import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Don't cache; keep it simple for now
export const dynamic = "force-dynamic";

// Create Supabase client with anon key - RLS policy allows public SELECT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Public shape returned to the client
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
  sellerId?: string;
  seller: { name: string; avatar: string; rating: number };
  vin?: string;
  yearFrom?: number;
  yearTo?: number;
};

// Raw row as returned from Supabase including JOIN alias fields
type RawListingRow = {
  id: string | number;
  title: string;
  price_cents?: number | null;
  price?: number | string | null;
  image_url?: string | null;
  image?: string | null;
  images?: string[] | null;
  category?: string | null;
  condition?: string | null;
  make?: string | null;
  model?: string | null;
  gen_code?: string | null;
  genCode?: string | null; // sometimes seed uses camelCase
  engine?: string | null;
  year?: number | string | null;
  oem?: string | null;
  description?: string | null;
  created_at?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  seller_avatar?: string | null;
  seller_rating?: number | string | null;
  vin?: string | null;
  year_from?: number | string | null;
  year_to?: number | string | null;
  seller?: unknown; // joined profile result
};

// Format £ from cents or accept preformatted string
function toGBP(row: RawListingRow): string {
  if (typeof row.price_cents === "number") {
    return "£" + (row.price_cents / 100).toFixed(2);
  }
  if (typeof row.price === "number") {
    return "£" + Number(row.price).toFixed(2);
  }
  if (typeof row.price === "string") {
    return row.price.startsWith("£") ? row.price : `£${row.price}`;
  }
  return "£0.00";
}

// Map raw DB row to public Listing shape
function mapDbRow(row: RawListingRow): Listing {
  const images: string[] =
    Array.isArray(row.images) && row.images.length
      ? row.images
      : row.image_url
      ? [row.image_url]
      : row.image
      ? [row.image]
      : [];

  // Supabase join may return array or object; normalise
  const sellerData = Array.isArray(row.seller) ? row.seller[0] : row.seller;
  let seller: Listing["seller"] = {
    name: "Seller",
    avatar: "/images/seller1.jpg",
    rating: 5,
  };
  if (sellerData && typeof sellerData === "object") {
    const s = sellerData as Record<string, unknown>;
    seller = {
      name: typeof s.name === "string" && s.name ? s.name : "Seller",
      avatar: typeof s.avatar === "string" && s.avatar ? s.avatar : "/images/seller1.jpg",
      rating: typeof s.rating === "number" ? s.rating : Number(s.rating ?? 5),
    };
  } else if (row.seller_name || row.seller_avatar || row.seller_rating) {
    seller = {
      name: row.seller_name || "Seller",
      avatar: row.seller_avatar || "/images/seller1.jpg",
      rating: Number(row.seller_rating ?? 5),
    };
  }

  return {
    id: row.id,
    title: row.title,
    price: toGBP(row),
    image: images[0] || "/images/placeholder.jpg",
    images,
    category: (row.category as Listing["category"]) || "OEM",
    condition: (row.condition as Listing["condition"]) || "Used - Good",
    make: row.make ?? undefined,
    model: row.model ?? undefined,
    genCode: row.gen_code ?? row.genCode ?? undefined,
    engine: row.engine ?? undefined,
    year: row.year ? Number(row.year) : undefined,
    oem: row.oem ?? undefined,
    description: row.description ?? "",
    createdAt: row.created_at || new Date().toISOString(),
    sellerId: row.seller_id ?? undefined,
    seller,
    vin: row.vin ?? undefined,
    yearFrom: typeof row.year_from === "number" ? row.year_from : row.year_from ? Number(row.year_from) : undefined,
    yearTo: typeof row.year_to === "number" ? row.year_to : row.year_to ? Number(row.year_to) : undefined,
  };
}

// Local fallback currently unused; stub retained for compatibility
async function findInLocal(_id?: string | null) {
  return _id ? null : [] as Listing[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Optional filters
  const maxPrice = searchParams.get("maxPrice"); // number in GBP
  const make = searchParams.get("make");
  const model = searchParams.get("model");
  const year = searchParams.get("year");
  const sort = searchParams.get("sort"); // "new" | "random"
  const limitParam = searchParams.get("limit");
  const limit = Math.min( Number(limitParam ?? 24) || 24, 100 );

  if (id) {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        seller:profiles!seller_id (
          name,
          avatar,
          rating
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("DB error fetching listing", id, error);
    }

    if (data) {
      return NextResponse.json(mapDbRow(data as RawListingRow), { status: 200 });
    }

    const local = await findInLocal(id);
    if (local) return NextResponse.json(local, { status: 200 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch a reasonable pool then filter in-process for now (simpler than complex OR queries)
  console.log("[listings API] Environment check:", {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
  });
  
  console.log("[listings API] Fetching from Supabase...");
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  console.log("[listings API] Query result:", { 
    hasData: !!data, 
    dataLength: data?.length || 0,
    hasError: !!error,
    error: error?.message,
    errorDetails: error
  });

  // If we got listings, enrich with seller info separately
  if (data && Array.isArray(data) && data.length > 0) {
    const sellerIds = [...new Set(data.map((l: any) => l.seller_id).filter(Boolean))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar, rating")
        .in("id", sellerIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      
      // Attach seller info to each listing
      data.forEach((listing: any) => {
        const profile = profileMap.get(listing.seller_id);
        if (profile) {
          listing.seller = profile;
        }
      });
    }
  }

  if (error) {
    console.error("DB error listing listings", error);
    return NextResponse.json({ error: "Database query failed", details: error.message, hint: error.hint }, { status: 500 });
  }

  if (!data || !Array.isArray(data)) {
    console.warn("No data returned from listings query");
    return NextResponse.json({ error: "No data", received: data, type: typeof data }, { status: 200 });
  }

  let rows: Listing[] = Array.isArray(data) && data.length ? (data as RawListingRow[]).map(mapDbRow) : ([] as Listing[]);

  // Apply filters
  const priceNumber = (p: string) => Number(String(p).replace(/[^\d.]/g, ""));
  if (maxPrice) {
    const cap = Number(maxPrice);
    if (Number.isFinite(cap)) rows = rows.filter((r) => priceNumber(r.price) <= cap);
  }
  if (make) {
    const mk = make.trim().toLowerCase();
    rows = rows.filter((r) => (r.make?.toLowerCase() === mk) || r.title.toLowerCase().includes(mk));
  }
  if (model) {
    const md = model.trim().toLowerCase();
    rows = rows.filter((r) => (r.model?.toLowerCase() === md) || r.title.toLowerCase().includes(md));
  }
  if (year) {
    const yr = Number(year);
    if (Number.isFinite(yr)) {
      rows = rows.filter((r) => {
        // If listing has year range, prefer that; otherwise try title match
        if (typeof r.yearFrom === 'number' && typeof r.yearTo === 'number') {
          return yr >= (r.yearFrom as number) && yr <= (r.yearTo as number);
        }
        if (typeof r.year === 'number') return r.year === yr;
        return r.title.includes(String(yr));
      });
    }
  }

  // Sort
  if (sort === "random") {
    rows = rows.map((x) => ({ x, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(({ x }) => x);
  } else {
    // default/new: keep createdAt desc already returned
  }

  // Cap results
  rows = rows.slice(0, limit);

  return NextResponse.json(rows, { status: 200 });
}
