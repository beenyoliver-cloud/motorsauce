-- ============================================================================
-- FIX PROFILE UPDATE PERMISSIONS
-- ============================================================================
-- This fixes issues with updating profile information (avatar, bio, etc.)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add background_image column if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS background_image TEXT;

COMMENT ON COLUMN public.profiles.background_image IS 'URL to user profile background/banner image';

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Recreate the update policy with explicit column access
CREATE POLICY "Users can update their own profile."
  ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
