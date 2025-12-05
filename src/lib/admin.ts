import { supabaseBrowser } from './supabase';
import { getCurrentUser } from './auth';

/**
 * Returns true if the currently authenticated user is in the admins table.
 * Uses API endpoint with service role to bypass RLS issues.
 * Falls back to false if unauthenticated or any error occurs.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[isAdmin] No user found');
      return false;
    }
    console.log('[isAdmin] Checking admin status for user:', user.id, user.email);
    
    const supabase = supabaseBrowser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[isAdmin] Session error:', sessionError);
      return false;
    }
    
    if (!session?.access_token) {
      console.log('[isAdmin] No access token in session');
      return false;
    }

    // Use API endpoint with service role (bypasses RLS)
    console.log('[isAdmin] Calling /api/is-admin endpoint');
    const res = await fetch('/api/is-admin', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[isAdmin] API response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[isAdmin] API error response:', errorText);
      return false;
    }

    const data = await res.json();
    console.log('[isAdmin] API response data:', JSON.stringify(data));
    
    const result = data?.isAdmin === true;
    console.log('[isAdmin] Final result:', result);
    return result;
  } catch (err) {
    console.error('[isAdmin] Exception:', err);
    return false;
  }
}
