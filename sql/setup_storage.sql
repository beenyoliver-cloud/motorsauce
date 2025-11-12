-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================
-- This script creates the storage bucket for listing images
-- =============================================================================

-- Create the storage bucket for parts images
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-images', 'parts-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Allow public access to read images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'parts-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'parts-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'parts-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'parts-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'parts-images';

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify you see the parts-images bucket in the output
-- 3. Go to Storage in Supabase Dashboard to confirm it's visible there
-- 4. Try uploading a listing image again
-- =============================================================================
