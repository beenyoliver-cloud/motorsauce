import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfileRow = {
  id: string;
  name: string | null;
  avatar?: string | null;
  rating?: number | null;
  listings_count?: number | null;
};

type SellerMetricRow = {
  seller_name: string;
  clicks: number | null;
};

type OrderItemRow = {
  seller_id: string | null;
  order?: { status?: string | null } | null;
};

const SALES_STATUSES = ["confirmed", "shipped", "delivered", "completed"];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  // Handle missing environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('[popular-sellers-weekly] Missing Supabase credentials');
    return NextResponse.json([]);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: sellers, error: sellersError } = await supabase
    .from("profiles")
    .select("id, name, avatar, rating, listings_count")
    .gt("listings_count", 0)
    .limit(300);

  if (sellersError) {
    console.error("[popular-sellers-weekly] Error fetching sellers:", sellersError);
    return NextResponse.json([]);
  }

  const profiles = (sellers || []) as ProfileRow[];
  if (!profiles.length) return NextResponse.json([]);

  const sellerIds = profiles.map((seller) => seller.id).filter(Boolean);
  const sellerNames = profiles
    .map((seller) => seller.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);

  let viewsByName: Record<string, number> = {};
  if (sellerNames.length > 0) {
    const { data: metrics, error: metricsError } = await supabase
      .from("seller_metrics")
      .select("seller_name, clicks")
      .in("seller_name", sellerNames);

    if (metricsError) {
      console.error("[popular-sellers-weekly] Error fetching seller metrics:", metricsError);
    } else if (Array.isArray(metrics)) {
      viewsByName = Object.fromEntries(
        (metrics as SellerMetricRow[]).map((row) => [row.seller_name, Number(row.clicks || 0)])
      );
    }
  }

  let salesBySellerId: Record<string, number> = {};
  if (sellerIds.length > 0) {
    const { data: salesRows, error: salesError } = await supabase
      .from("order_items")
      .select("seller_id, order:orders!inner(status)")
      .in("seller_id", sellerIds)
      .in("order.status", SALES_STATUSES);

    if (salesError) {
      console.error("[popular-sellers-weekly] Error fetching sales:", salesError);
    } else if (Array.isArray(salesRows)) {
      salesBySellerId = (salesRows as OrderItemRow[]).reduce<Record<string, number>>((acc, row) => {
        if (!row.seller_id) return acc;
        acc[row.seller_id] = (acc[row.seller_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const ranked = profiles
    .map((seller) => {
      const name = seller.name || "Unknown";
      return {
        seller_id: seller.id,
        seller_name: name,
        avatar: seller.avatar || undefined,
        rating: typeof seller.rating === "number" ? seller.rating : 5.0,
        clicks: viewsByName[name] ?? 0,
        sold_count: salesBySellerId[seller.id] ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.sold_count !== a.sold_count) return b.sold_count - a.sold_count;
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return a.seller_name.localeCompare(b.seller_name);
    });

  return NextResponse.json(ranked.slice(0, 6));
}
