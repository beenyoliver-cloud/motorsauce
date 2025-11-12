-- =============================================================================
-- RESET ADMIN PASSWORD
-- =============================================================================
-- This script will reset the admin password so you can log in
-- Run this in Supabase SQL Editor if you don't know the admin password
-- =============================================================================

-- Option 1: Set a known password (requires service role key)
-- You'll need to use the Supabase dashboard Auth section to reset password manually
-- OR use the Supabase CLI/API

-- Option 2: Get the admin user ID to manually reset password in Supabase Dashboard
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@motorsource.dev';

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Copy the user ID from the query result above
-- 2. Go to: Authentication > Users in Supabase Dashboard
-- 3. Find the user with that ID or email: admin@motorsource.dev
-- 4. Click the three dots menu (...) next to the user
-- 5. Select "Reset Password"
-- 6. Choose "Send Reset Password Email" OR "Generate New Password"
-- 7. Use that password to log in at /auth/login
-- =============================================================================

-- Alternative: If you want to set a specific password, you need to use the Supabase API
-- This can't be done directly in SQL for security reasons
