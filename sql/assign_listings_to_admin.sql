-- Assign all test listings to the Admin account
-- Run this in your Supabase SQL editor

-- Step 1: Find the Admin user ID (from auth.users where email matches admin)
-- You can check: SELECT id, email FROM auth.users WHERE email LIKE '%admin%' OR role = 'admin';

-- Step 2: Ensure Admin has a profile entry
-- Replace 'ADMIN_USER_ID_HERE' with the actual UUID from Step 1
INSERT INTO public.profiles (id, name, email, created_at, updated_at)
VALUES (
  'ADMIN_USER_ID_HERE',
  'Admin',
  'admin@motorsource.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- Step 3: Update all listings to use the Admin as seller
UPDATE public.listings
SET seller_id = 'ADMIN_USER_ID_HERE'
WHERE seller_id IS NULL OR seller_id != 'ADMIN_USER_ID_HERE';

-- Verify the changes
SELECT COUNT(*) as listings_count FROM public.listings WHERE seller_id = 'ADMIN_USER_ID_HERE';
SELECT * FROM public.profiles WHERE id = 'ADMIN_USER_ID_HERE';
