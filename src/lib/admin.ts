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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.log('[isAdmin] No access token');
      return false;
    }

    // Use API endpoint with service role (bypasses RLS)
    const res = await fetch('/api/is-admin', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      console.error('[isAdmin] API returned status:', res.status);
      return false;
    }

    const { isAdmin: result } = await res.json();
    console.log('[isAdmin] Result:', result);
    return result;
  } catch (err) {
    console.error('[isAdmin] Exception:', err);
    return false;
  }
}
