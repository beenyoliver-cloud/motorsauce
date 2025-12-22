import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  // Handle missing environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('[popular-sellers-weekly] Missing Supabase credentials');
    return NextResponse.json(
      { error: 'Server configuration error', sellers: [] },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get the date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);


  // Query all profile_visits in the last 7 days
  const { data, error } = await supabase
    .from('profile_visits')
    .select('seller_id')
    .gte('visited_at', sevenDaysAgo.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate visit counts per seller_id
  const visitCounts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.seller_id) {
      visitCounts[row.seller_id] = (visitCounts[row.seller_id] || 0) + 1;
    }
  }

  // Get top 10 seller_ids by visit count
  const topSellerIds = Object.entries(visitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sellerId]) => sellerId);

  // Fetch seller profile info for each seller
  let sellers: any[] = [];
  if (topSellerIds.length > 0) {
    const { data: sellerData, error: sellersError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', topSellerIds);
    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 });
    }
    sellers = sellerData ?? [];
  }

  // Merge visit counts with seller profiles
  const result = sellers.map((seller: any) => ({
    ...seller,
    weekly_visits: visitCounts[seller.id] || 0,
  }));

  return NextResponse.json(result);
}
