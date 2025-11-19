-- ============================================================================
-- SUPABASE STORAGE BUCKETS FOR BUSINESS IMAGES
-- ============================================================================
-- Run this in Supabase SQL Editor to create storage buckets for business
-- logos and banners with proper access policies.
--
-- STATUS: ✅ Executed successfully on 19 November 2025
-- ============================================================================

-- Create business-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create business-banners bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-banners', 'business-banners', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR BUSINESS-LOGOS
-- ============================================================================

-- Allow public read access to logos
CREATE POLICY "Public Access to Business Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Allow authenticated users to upload their own logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES FOR BUSINESS-BANNERS
-- ============================================================================

-- Allow public read access to banners
CREATE POLICY "Public Access to Business Banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-banners');

-- Allow authenticated users to upload their own banners
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own banners
CREATE POLICY "Users can update own banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own banners
CREATE POLICY "Users can delete own banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT id, name, public
FROM storage.buckets
WHERE id IN ('business-logos', 'business-banners');
