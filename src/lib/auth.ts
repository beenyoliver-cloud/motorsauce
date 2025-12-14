'use client';

import { supabaseBrowser } from './supabase';

export type LocalUser = { 
  id: string; 
  name: string; 
  email: string;
  avatar?: string | null;
  background_image?: string | null;
  about?: string | null;
};

// Helper function to namespace localStorage keys by user
export function nsKey(suffix: string): string {
  // Namespace by current user id when available; otherwise scope to anon.
  // Uses cached user (set by getCurrentUser/login flows) to avoid async.
  const uid = _cachedUser?.id || "anon";
  return `ms_u:${uid}:${suffix}`;
}

// Check if a profile belongs to the current user
export async function isMe(displayName: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  return normalizeDisplayName(currentUser.name) === normalizeDisplayName(displayName);
}

export async function loginWithEmail(email: string, password: string): Promise<{ user: LocalUser | null; error: string | null }> {
  const supabase = supabaseBrowser();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'No user found' };
  }

  // Fetch the user's profile from the profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', data.user.id)
    .single();

  const user: LocalUser = {
    id: data.user.id,
    email: profile?.email || data.user.email!,
    name: profile?.name || data.user.user_metadata.name || email.split('@')[0]
  };

  // Cache the user
  _cachedUser = user;

  return { user, error: null };
}

export async function registerUser(
  name: string, 
  email: string, 
  password: string,
  accountType: 'individual' | 'business' = 'individual',
  businessInfo?: { businessName: string; businessType: string }
): Promise<LocalUser> {
  const supabase = supabaseBrowser();
  
  // Check if username already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('name', name.trim())
    .single();
  
  if (existingProfile) {
    throw new Error('This username is already taken. Please choose a different one.');
  }
  
  // Register the new user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        account_type: accountType
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('This email is already registered');
    }
    throw error;
  }

  if (!data.user) {
    throw new Error('Registration failed');
  }

  // Check if session was created (email confirmation disabled) or needs confirmation
  if (!data.session) {
    // No session means email confirmation is required, or we need to sign in manually
    // Try to sign in immediately after registration
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      // If sign in fails, user may need to confirm email first
      console.log('Auto sign-in after registration failed:', signInError.message);
      // We'll continue anyway - the user object was created
    }
  }

  // Dispatch auth event to update UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ms:auth'));
  }

  // If business account, create business_info record
  if (accountType === 'business' && businessInfo) {
    try {
      // Wait for profile to be created by trigger (max 5 seconds)
      let profileExists = false;
      for (let i = 0; i < 10; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          profileExists = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
      }

      if (profileExists) {
        // Update profile with business account type
        await supabase
          .from('profiles')
          .update({ account_type: 'business' })
          .eq('id', data.user.id);

        // Create business info
        const { error: bizError } = await supabase
          .from('business_info')
          .insert({
            profile_id: data.user.id,
            business_name: businessInfo.businessName,
            business_type: businessInfo.businessType
          });

        if (bizError) {
          console.error('Failed to create business info:', bizError);
          // Don't fail registration, user can complete in settings
        }
      } else {
        console.error('Profile not created within timeout - business setup skipped');
      }
    } catch (bizErr) {
      console.error('Business setup error:', bizErr);
      // Continue with registration
    }
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    name: data.user.user_metadata.name
  };
}

export async function logout() {
  try {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signOut error:', error);
      throw error;
    }
    // Clear cached user
    _cachedUser = null;
  } catch (err) {
    console.error('Logout failed:', err);
    // Clear cached user even on error
    _cachedUser = null;
    throw err;
  }
}

// Cached user for synchronous access
let _cachedUser: LocalUser | null = null;

export async function getCurrentUser(): Promise<LocalUser | null> {
  const supabase = supabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    _cachedUser = null;
    return null;
  }

  // Fetch the user's profile from the profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, email, avatar, background_image, about')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('[getCurrentUser] Profile fetch error:', profileError);
  }

  if (!profile) {
    // If profile doesn't exist, return basic user info from auth
    _cachedUser = {
      id: user.id,
      email: user.email || '',
      name: user.email?.split('@')[0] || 'User'
    };
    return _cachedUser;
  }

  _cachedUser = {
    id: user.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    background_image: profile.background_image,
    about: profile.about
  };
  return _cachedUser;
}

// Synchronous helper that returns the last cached user (may be stale)
// Use this only when you cannot await - prefer getCurrentUser() when possible
export function getCurrentUserSync(): LocalUser | null {
  return _cachedUser;
}

export function normalizeDisplayName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function getUserByDisplayName(displayName: string): Promise<LocalUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return normalizeDisplayName(user.name) === normalizeDisplayName(displayName) ? user : null;
}
