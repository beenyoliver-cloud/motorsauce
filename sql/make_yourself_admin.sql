-- ============================================
-- MAKE YOURSELF ADMIN - QUICK SETUP
-- ============================================
-- Run this in Supabase SQL Editor
-- Follow steps 1, 2, 3 in order

-- ============================================
-- STEP 1: See all users (find yourself)
-- ============================================
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as name,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- ⬆️ LOOK FOR YOUR EMAIL ABOVE
-- Copy the 'id' value (it's a UUID like: 12345678-1234-1234-1234-123456789abc)


-- ============================================
-- STEP 2: Check current admins
-- ============================================
SELECT 
  a.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  a.created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.id;

-- ⬆️ If you see an error "relation public.admins does not exist"
-- You need to create the table first. Run this:

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- STEP 3: Add yourself as admin
-- ============================================
-- OPTION A: Add by email (EASIEST - just change the email)
INSERT INTO public.admins (id)
SELECT id FROM auth.users 
WHERE email = 'YOUR-EMAIL@example.com'  -- ⬅️ CHANGE THIS TO YOUR EMAIL
ON CONFLICT (id) DO NOTHING;

-- OPTION B: Add by user ID (if you prefer)
-- Uncomment and replace YOUR-USER-ID-HERE with the UUID from step 1:
-- INSERT INTO public.admins (id) VALUES ('YOUR-USER-ID-HERE') ON CONFLICT (id) DO NOTHING;


-- ============================================
-- STEP 4: Verify you're now an admin
-- ============================================
SELECT 
  a.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  a.created_at as admin_since
FROM public.admins a
JOIN auth.users u ON u.id = a.id
ORDER BY a.created_at DESC;

-- ⬆️ You should see your email in the results!
-- Now refresh your website and click "Admin Tools" in footer


-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If admin tools still not showing:
-- 1. Make sure you're LOGGED IN (see your profile in header)
-- 2. Visit: /admin/status (should show green checkmarks)
-- 3. Clear browser cache and refresh
-- 4. Try logging out and back in
