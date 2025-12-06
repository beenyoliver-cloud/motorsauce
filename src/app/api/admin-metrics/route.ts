
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

    // Get metrics using service role (bypass RLS)
    const [listingsRes, usersRes, salesRes] = await Promise.all([
      serviceSupabase.from('listings').select('id', { count: 'exact', head: true }),
      serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }),
      serviceSupabase.from('offers').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'completed']),
    ]);

    return NextResponse.json({
      total_listings: listingsRes?.count ?? 0,
      total_users: usersRes?.count ?? 0,
      total_sales: salesRes?.count ?? 0,
    });
  } catch (error: any) {
    console.error('[admin-metrics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
