-- =============================================================================
-- ADD AVATAR COLUMN TO PROFILES
-- =============================================================================
-- This script adds an avatar column to store user profile pictures
-- =============================================================================

-- Add avatar column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar text;

-- Create index for avatar lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON public.profiles(avatar);

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'avatar';

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify the avatar column was added
-- 3. Users can now have profile pictures stored as URLs
-- =============================================================================
