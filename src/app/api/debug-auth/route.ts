import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ 
      authenticated: false,
      error: userError?.message || 'No user found'
    });
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Check admin status
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    },
    profile: profile || { error: profileError?.message },
    isAdmin: !!admin,
    adminError: adminError?.message,
  });
}
