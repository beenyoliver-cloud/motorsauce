-- Quick fix: Create a profile for the existing seller_id so listings work immediately
-- Run this in your Supabase SQL editor

-- Create profile for the current seller_id used in test listings
INSERT INTO public.profiles (id, name, email, created_at, updated_at)
VALUES (
  'fef3849c-7d57-49e7-84a9-89de0c7d0995',
  'Test Seller',
  'test@motorsource.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- Verify the profile was created
SELECT * FROM public.profiles WHERE id = 'fef3849c-7d57-49e7-84a9-89de0c7d0995';

-- Check how many listings use this seller_id
SELECT COUNT(*) FROM public.listings WHERE seller_id = 'fef3849c-7d57-49e7-84a9-89de0c7d0995';
