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
    return NextResponse.json([]);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get the date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch sellers with active listings, ordered by most recent
  const { data: sellers, error } = await supabase
    .from('profiles')
    .select('id, name, avatar, rating')
    .gt('listings_count', 0) // Only sellers with listings
    .limit(6);

  if (error) {
    console.error('[popular-sellers-weekly] Error fetching sellers:', error);
    return NextResponse.json([]);
  }

  const result = (sellers || []).map((seller: any) => ({
    seller_id: seller.id,
    seller_name: seller.name || 'Unknown',
    avatar: seller.avatar || undefined,
    rating: seller.rating || 5.0,
    sold_count: undefined,
  }));

  return NextResponse.json(result);
}
