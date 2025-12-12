
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

    // Check if user is admin using service role
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceRoleKey) {
      console.error('[admin-metrics] No service role key found');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { data: admin, error: adminError } = await serviceSupabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !admin) {
      console.error('[admin-metrics] Admin check failed:', adminError);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date calculations
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get all metrics in parallel using service role (bypass RLS)
    // Split into safe queries and optional queries (that might fail if tables/columns don't exist)
    const [
      // Totals
      listingsRes,
      activeListingsRes,
      draftListingsRes,
      soldListingsRes,
      usersRes,
      salesRes,
      // Today
      usersToday,
      listingsToday,
      // This week
      usersWeek,
      listingsWeek,
      // This month
      usersMonth,
      listingsMonth,
    ] = await Promise.all([
      // Totals
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
      serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }),
      serviceSupabase.from('offers').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'completed']),
      // Today
      serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      // This week
      serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      // This month
      serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);
    
    // Log errors from core queries
    if (listingsRes.error) console.error('[admin-metrics] listings error:', listingsRes.error);
    if (usersRes.error) console.error('[admin-metrics] users error:', usersRes.error);
    if (salesRes.error) console.error('[admin-metrics] sales error:', salesRes.error);

    // Moderation queries - these may fail if columns/tables don't exist yet, so handle gracefully
    let pendingReports = { count: 0 };
    let bannedUsers = { count: 0 };
    let suspendedUsers = { count: 0 };
    
    try {
      const reportsResult = await serviceSupabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (!reportsResult.error) pendingReports = { count: reportsResult.count || 0 };
    } catch (e) {
      console.log('[admin-metrics] user_reports table may not exist yet');
    }
    
    try {
      const bannedResult = await serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true);
      if (!bannedResult.error) bannedUsers = { count: bannedResult.count || 0 };
      else console.log('[admin-metrics] is_banned column may not exist:', bannedResult.error.message);
    } catch (e) {
      console.log('[admin-metrics] is_banned query failed');
    }
    
    try {
      const suspendedResult = await serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_suspended', true);
      if (!suspendedResult.error) suspendedUsers = { count: suspendedResult.count || 0 };
      else console.log('[admin-metrics] is_suspended column may not exist:', suspendedResult.error.message);
    } catch (e) {
      console.log('[admin-metrics] is_suspended query failed');
    }

    // Get top sellers (top 5)
    const { data: topSellers } = await serviceSupabase
      .from('listings')
      .select('seller_id, profiles!inner(id, name, avatar_url)')
      .eq('status', 'sold')
      .limit(100);

    // Count sales per seller
    const sellerSales: Record<string, { name: string; avatar: string; count: number }> = {};
    topSellers?.forEach((listing: any) => {
      const sellerId = listing.seller_id;
      const profile = listing.profiles;
      if (!sellerSales[sellerId]) {
        sellerSales[sellerId] = { 
          name: profile?.name || 'Unknown', 
          avatar: profile?.avatar_url || '', 
          count: 0 
        };
      }
      sellerSales[sellerId].count++;
    });

    const topSellersArray = Object.entries(sellerSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent activity - user_reports might not exist yet
    const [recentUsers, recentListings] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      serviceSupabase
        .from('listings')
        .select('id, title, seller_id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
    
    // Try to get recent reports if table exists
    let recentReportsData: any[] = [];
    try {
      const reportsResult = await serviceSupabase
        .from('user_reports')
        .select('id, reason, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!reportsResult.error) recentReportsData = reportsResult.data || [];
    } catch (e) {
      console.log('[admin-metrics] user_reports table may not exist for recent reports');
    }

    return NextResponse.json({
      // Basic totals
      total_listings: listingsRes?.count ?? 0,
      total_users: usersRes?.count ?? 0,
      total_sales: salesRes?.count ?? 0,
      
      // Listing breakdown
      active_listings: activeListingsRes?.count ?? 0,
      draft_listings: draftListingsRes?.count ?? 0,
      sold_listings: soldListingsRes?.count ?? 0,
      
      // Today
      users_today: usersToday?.count ?? 0,
      listings_today: listingsToday?.count ?? 0,
      
      // This week
      users_week: usersWeek?.count ?? 0,
      listings_week: listingsWeek?.count ?? 0,
      
      // This month
      users_month: usersMonth?.count ?? 0,
      listings_month: listingsMonth?.count ?? 0,
      
      // Moderation
      pending_reports: pendingReports.count ?? 0,
      banned_users: bannedUsers.count ?? 0,
      suspended_users: suspendedUsers.count ?? 0,
      
      // Top sellers
      top_sellers: topSellersArray,
      
      // Recent activity
      recent_users: recentUsers?.data || [],
      recent_listings: recentListings?.data || [],
      recent_reports: recentReportsData,
    });
  } catch (error: any) {
    console.error('[admin-metrics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
