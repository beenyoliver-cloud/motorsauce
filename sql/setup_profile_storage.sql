-- ============================================================================
-- SUPABASE STORAGE BUCKETS FOR PROFILE IMAGES
-- ============================================================================
-- Run this in Supabase SQL Editor to create storage buckets for profile
-- avatars and background images with proper access policies.
-- ============================================================================

-- Create profile-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create profile-backgrounds bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-backgrounds', 'profile-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR PROFILE-AVATARS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to Profile Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Allow public read access to avatars
CREATE POLICY "Public Access to Profile Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES FOR PROFILE-BACKGROUNDS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to Profile Backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own backgrounds" ON storage.objects;

-- Allow public read access to backgrounds
CREATE POLICY "Public Access to Profile Backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-backgrounds');

-- Allow authenticated users to upload their own backgrounds
CREATE POLICY "Authenticated users can upload backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own backgrounds
CREATE POLICY "Users can update own backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own backgrounds
CREATE POLICY "Users can delete own backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- ADD BACKGROUND_IMAGE COLUMN TO PROFILES TABLE
-- ============================================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS background_image TEXT;

COMMENT ON COLUMN public.profiles.background_image IS 'URL to user profile background/banner image';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT id, name, public
FROM storage.buckets
WHERE id IN ('profile-avatars', 'profile-backgrounds');
