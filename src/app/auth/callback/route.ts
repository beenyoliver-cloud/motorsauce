import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const type = requestUrl.searchParams.get('type'); // 'signup', 'recovery', etc.

  if (code) {
    // Create a client with anon key for code exchange
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error.message);
      // Redirect to login with error
      return NextResponse.redirect(new URL('/auth/login?error=verification_failed', requestUrl.origin));
    }
    
    if (data?.session) {
      // If this was a password recovery, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
      }
      
      // Successfully verified email - redirect to home or next page
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // No code or failed exchange - redirect to login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}