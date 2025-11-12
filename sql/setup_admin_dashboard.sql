-- =============================================================================
-- ADMIN DASHBOARD SETUP SCRIPT
-- =============================================================================
-- This script will set up the admin account and ensure the admin dashboard works
-- 
-- Steps:
-- 1. Update the "Admin" user's email to admin@motorsource.dev
-- 2. Add the user to the admins table
-- 3. Verify the setup
-- =============================================================================

-- STEP 1: Update email in auth.users and profiles
-- =============================================================================
UPDATE auth.users
SET 
  email = 'admin@motorsource.dev',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{email}',
    '"admin@motorsource.dev"'
  ),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM public.profiles WHERE name = 'Admin'
);

UPDATE public.profiles
SET email = 'admin@motorsource.dev'
WHERE name = 'Admin';

-- STEP 2: Add user to admins table
-- =============================================================================
INSERT INTO public.admins (id)
SELECT id FROM public.profiles WHERE name = 'Admin'
ON CONFLICT (id) DO NOTHING;

-- STEP 3: Verify the setup
-- =============================================================================
SELECT 
  p.id,
  p.name,
  p.email as profile_email,
  u.email as auth_email,
  CASE 
    WHEN a.id IS NOT NULL THEN '✓ IS ADMIN'
    ELSE '✗ NOT ADMIN'
  END as admin_status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
LEFT JOIN public.admins a ON p.id = a.id
WHERE p.name = 'Admin';

-- =============================================================================
-- INSTRUCTIONS AFTER RUNNING THIS SCRIPT:
-- =============================================================================
-- 1. Log out from the current session
-- 2. Clear browser localStorage (F12 > Application > Local Storage > Clear)
-- 3. Log in with: admin@motorsource.dev
-- 4. The "Admin" link should now appear in the header
-- 5. Click it to access /admin/dashboard
-- =============================================================================
