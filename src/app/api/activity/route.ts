import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type ActivityItem = {
  id: string;
  type: "listing" | "sale";
  title: string;
  sellerName: string;
  sellerId: string;
  timestamp: string;
  image?: string;
};

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const activities: ActivityItem[] = [];

    // Get recent listings (last 7 days for more data)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentListings, error: listingsError } = await supabase
      .from("listings")
      .select("id, title, seller_id, created_at, images")
      .eq("status", "active")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(15);

    console.log("[Activity API] Recent listings:", { 
      count: recentListings?.length, 
      error: listingsError?.message 
    });

    // Get recent sales (last 30 days for more data)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSales, error: salesError } = await supabase
      .from("listings")
      .select("id, title, seller_id, marked_sold_at, images")
      .eq("status", "sold")
      .not("marked_sold_at", "is", null)
      .order("marked_sold_at", { ascending: false })
      .limit(15);

    console.log("[Activity API] Recent sales:", { 
      count: recentSales?.length, 
      error: salesError?.message 
    });

    // Fallback: if no recent listings, get any active listings
    let listingsToUse = recentListings || [];
    if (listingsToUse.length === 0) {
      const { data: anyListings } = await supabase
        .from("listings")
        .select("id, title, seller_id, created_at, images")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      listingsToUse = anyListings || [];
      console.log("[Activity API] Fallback listings:", listingsToUse.length);
    }

    // Get seller IDs to fetch profiles
    const sellerIds = new Set<string>();
    listingsToUse?.forEach((l) => l.seller_id && sellerIds.add(l.seller_id));
    recentSales?.forEach((l) => l.seller_id && sellerIds.add(l.seller_id));

    // Fetch profiles with opt-out setting
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, show_in_activity_feed")
      .in("id", Array.from(sellerIds));

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Process listings
    listingsToUse?.forEach((listing) => {
      const profile = profileMap.get(listing.seller_id);
      // Skip if seller opted out of activity feed (show_in_activity_feed = false)
      if (profile?.show_in_activity_feed === false) return;
      
      activities.push({
        id: `listing-${listing.id}`,
        type: "listing",
        title: listing.title,
        sellerName: profile?.name || "A seller",
        sellerId: listing.seller_id,
        timestamp: listing.created_at,
        image: listing.images?.[0],
      });
    });

    // Process sales
    recentSales?.forEach((sale) => {
      const profile = profileMap.get(sale.seller_id);
      // Skip if seller opted out of activity feed (show_in_activity_feed = false)
      if (profile?.show_in_activity_feed === false) return;
      
      activities.push({
        id: `sale-${sale.id}`,
        type: "sale",
        title: sale.title,
        sellerName: profile?.name || "A seller",
        sellerId: sale.seller_id,
        timestamp: sale.marked_sold_at,
        image: sale.images?.[0],
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 15 activities
    return NextResponse.json(activities.slice(0, 15));
  } catch (error) {
    console.error("Activity feed error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
