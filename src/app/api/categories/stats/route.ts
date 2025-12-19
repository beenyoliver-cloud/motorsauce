// src/app/api/categories/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

type CategoryStats = {
  totalListings: number;
  listingsThisWeek: number;
  activeSellers: number;
  avgRating: number | null;
  priceRange: { min: number; max: number } | null;
  topMakes: string[];
  recentlySold: Array<{
    id: string;
    title: string;
    price: number;
    soldAt: string;
    image: string | null;
  }>;
  topSellers: Array<{
    id: string;
    name: string;
    avatar: string | null;
    rating: number;
    listingsCount: number;
  }>;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.toLowerCase() || "";
  const make = searchParams.get("make") || "";

  if (!category || !["oem", "aftermarket", "tools", "tool"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Normalize category name - database uses "Tool" (singular), but we accept both "tool" and "tools"
  const categoryFilter = category === "tools" || category === "tool" ? "Tool" : category === "oem" ? "OEM" : "Aftermarket";

  try {
    const supabase = getSupabase();

    // 1. Total active listings
    let totalQuery = supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("category", categoryFilter)
      .eq("status", "active");
    
    if (make) totalQuery = totalQuery.eq("make", make);
    const { count: totalListings } = await totalQuery;

    // 2. Listings this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let weekQuery = supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("category", categoryFilter)
      .eq("status", "active")
      .gte("created_at", weekAgo);
    
    if (make) weekQuery = weekQuery.eq("make", make);
    const { count: listingsThisWeek } = await weekQuery;

    // 3. Active sellers (distinct seller_id with listings in this category)
    let sellersQuery = supabase
      .from("listings")
      .select("seller_id")
      .eq("category", categoryFilter)
      .eq("status", "active");
    
    if (make) sellersQuery = sellersQuery.eq("make", make);
    const { data: sellerRows } = await sellersQuery;
    const uniqueSellers = new Set((sellerRows || []).map((r: { seller_id: string }) => r.seller_id));
    const activeSellers = uniqueSellers.size;

    // 4. Price range
    let priceQuery = supabase
      .from("listings")
      .select("price")
      .eq("category", categoryFilter)
      .eq("status", "active")
      .not("price", "is", null);
    
    if (make) priceQuery = priceQuery.eq("make", make);
    const { data: priceRows } = await priceQuery;
    
    let priceRange: { min: number; max: number } | null = null;
    if (priceRows && priceRows.length > 0) {
      const prices = priceRows.map((r: { price: number }) => Number(r.price)).filter((p: number) => p > 0);
      if (prices.length > 0) {
        priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
      }
    }

    // 5. Top makes (only for non-tools categories)
    let topMakes: string[] = [];
    if (category !== "tools" && category !== "tool") {
      const { data: makeRows } = await supabase
        .from("listings")
        .select("make")
        .eq("category", categoryFilter)
        .eq("status", "active")
        .not("make", "is", null);
      
      if (makeRows) {
        const makeCounts: Record<string, number> = {};
        makeRows.forEach((r: { make: string }) => {
          if (r.make) makeCounts[r.make] = (makeCounts[r.make] || 0) + 1;
        });
        topMakes = Object.entries(makeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([m]) => m);
      }
    }

    // 6. Recently sold items
    let soldQuery = supabase
      .from("listings")
      .select("id, title, price, updated_at, images")
      .eq("category", categoryFilter)
      .eq("status", "sold")
      .order("updated_at", { ascending: false })
      .limit(6);
    
    if (make) soldQuery = soldQuery.eq("make", make);
    const { data: soldRows } = await soldQuery;
    
    const recentlySold = (soldRows || []).map((r: { id: string; title: string; price: number; updated_at: string; images: string[] }) => ({
      id: r.id,
      title: r.title || "Untitled",
      price: Number(r.price) || 0,
      soldAt: r.updated_at,
      image: Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null,
    }));

    // 7. Top sellers - sellers with most listings + highest ratings
    const sellerIds = Array.from(uniqueSellers).slice(0, 50) as string[];
    let topSellers: CategoryStats["topSellers"] = [];
    
    if (sellerIds.length > 0) {
      // Get seller profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar, rating")
        .in("id", sellerIds);
      
      if (profiles) {
        // Count listings per seller
        const sellerListingCounts: Record<string, number> = {};
        (sellerRows || []).forEach((r: { seller_id: string }) => {
          sellerListingCounts[r.seller_id] = (sellerListingCounts[r.seller_id] || 0) + 1;
        });
        
        topSellers = profiles
          .map((p: { id: string; name: string; avatar: string | null; rating: number }) => ({
            id: p.id,
            name: p.name || "Unknown Seller",
            avatar: p.avatar || null,
            rating: Number(p.rating) || 0,
            listingsCount: sellerListingCounts[p.id] || 0,
          }))
          .filter((s: { rating: number; listingsCount: number }) => s.rating >= 4 || s.listingsCount >= 3)
          .sort((a: { rating: number; listingsCount: number }, b: { rating: number; listingsCount: number }) => {
            // Sort by rating first, then by listings count
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.listingsCount - a.listingsCount;
          })
          .slice(0, 4);
      }
    }

    // 8. Average rating (from reviews on listings in this category)
    let avgRating: number | null = null;
    if (topSellers.length > 0) {
      const ratings = topSellers.map((s) => s.rating).filter((r) => r > 0);
      if (ratings.length > 0) {
        avgRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      }
    }

    const stats: CategoryStats = {
      totalListings: totalListings || 0,
      listingsThisWeek: listingsThisWeek || 0,
      activeSellers,
      avgRating,
      priceRange,
      topMakes,
      recentlySold,
      topSellers,
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[Category Stats] Error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
