import { supabaseBrowser } from './supabase';
import { getCurrentUser } from './auth';

/**
 * Returns true if the currently authenticated user is in the admins table.
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
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('[isAdmin] Query error:', error);
      return false;
    }
    
    const result = !!data;
    console.log('[isAdmin] Result:', result, 'Data:', data);
    return result;
  } catch (err) {
    console.error('[isAdmin] Exception:', err);
    return false;
  }
}
