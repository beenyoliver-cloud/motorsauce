import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a business owner
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.account_type !== 'business') {
      return NextResponse.json({ error: 'Only business accounts can access analytics' }, { status: 403 });
    }

    // Date calculations
    const now = new Date();
    const todayStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStart = todayStartDate.toISOString();
    const weekStartDate = new Date(todayStartDate);
    weekStartDate.setDate(todayStartDate.getDate() - todayStartDate.getDay());
    const weekStart = weekStartDate.toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get all metrics for this business only
    const [
      // Totals
      allListingsRes,
      activeListingsRes,
      soldListingsRes,
      totalViewsRes,
      totalOffersRes,
      acceptedOffersRes,
      // Today
      listingsToday,
      offersToday,
      // This week
      listingsWeek,
      offersWeek,
      // This month
      listingsMonth,
      offersMonth,
    ] = await Promise.all([
      // Totals - all listings for this seller
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id),
      // Active listings
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('status', 'active'),
      // Sold listings
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('status', 'sold'),
      // Total views
      supabase
        .from('listings')
        .select('view_count')
        .eq('seller_id', user.id),
      // Total offers received
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id),
      // Accepted offers
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .in('status', ['accepted', 'completed']),
      // Today
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', todayStart),
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', todayStart),
      // This week
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', weekStart),
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', weekStart),
      // This month
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', monthStart),
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', monthStart),
    ]);

    // Calculate total views
    const totalViews = (viewsData: any[] | null) => {
      if (!Array.isArray(viewsData)) return 0;
      return viewsData.reduce((sum, item) => sum + (item.view_count || 0), 0);
    };

    // Get recent listings
    const { data: recentListings } = await supabase
      .from('listings')
      .select('id, title, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get top performing listings
    const { data: topListings } = await supabase
      .from('listings')
      .select('id, title, view_count, price')
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('view_count', { ascending: false })
      .limit(5);

    // Get all listings for insights
    const { data: allListings } = await supabase
      .from('listings')
      .select('id, title, price, created_at, view_count, oem, images')
      .eq('seller_id', user.id)
      .limit(200);

    return NextResponse.json({
      total_listings: allListingsRes.count || 0,
      active_listings: activeListingsRes.count || 0,
      sold_listings: soldListingsRes.count || 0,
      total_views: totalViews(totalViewsRes.data),
      total_offers: totalOffersRes.count || 0,
      accepted_offers: acceptedOffersRes.count || 0,
      listings_today: listingsToday.count || 0,
      offers_today: offersToday.count || 0,
      listings_week: listingsWeek.count || 0,
      offers_week: offersWeek.count || 0,
      listings_month: listingsMonth.count || 0,
      offers_month: offersMonth.count || 0,
      recent_listings: recentListings || [],
      top_listings: topListings || [],
      all_listings: allListings || [],
    });
  } catch (error) {
    console.error('[business-metrics] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
