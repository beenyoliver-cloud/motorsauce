
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  // Check if user is admin
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .single();
  if (adminError || !admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get metrics
  const [listingsRes, usersRes, salesRes] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('offers').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'completed']),
  ]);

  return NextResponse.json({
    total_listings: listingsRes?.count ?? 0,
    total_users: usersRes?.count ?? 0,
    total_sales: salesRes?.count ?? 0,
  });
}
