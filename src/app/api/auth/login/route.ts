import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { email, password } = await request.json();
    console.log('[login API] Request received', { email: email?.substring(0, 3) + '***', timestamp: new Date().toISOString() });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const beforeAuth = Date.now();
    const supabase = createRouteHandlerClient({ cookies: await cookies });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const authDuration = Date.now() - beforeAuth;
    console.log('[login API] Auth call completed', { authDuration, hasError: !!error, hasUser: !!data?.user });

    if (error) {
      console.error('[login API] Auth error', { message: error.message, code: error.status });
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      console.warn('[login API] Auth succeeded but no user/session returned');
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 401 }
      );
    }

    // Fetch profile
    const beforeProfile = Date.now();
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', data.user.id)
      .single();
    const profileDuration = Date.now() - beforeProfile;
    console.log('[login API] Profile fetch completed', { profileDuration, hasProfile: !!profile });

    const totalDuration = Date.now() - startTime;
    console.log('[login API] Request completed', { totalDuration, authDuration, profileDuration });

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: profile?.email || data.user.email,
        name: profile?.name || data.user.user_metadata.name || email.split('@')[0],
      },
    });
  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error('[login API] Exception', { error: err instanceof Error ? err.message : String(err), totalDuration });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
