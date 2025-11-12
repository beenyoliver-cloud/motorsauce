-- Update admin account email to admin@motorsource.dev
-- This updates both the auth.users table and the profiles table

-- First, find the user with the name 'Admin' or current admin email
-- Then update their email in auth.users and profiles

-- Update the email in auth.users (this is the authentication email)
UPDATE auth.users
SET email = 'admin@motorsource.dev',
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

-- Update the email in profiles table
UPDATE public.profiles
SET email = 'admin@motorsource.dev'
WHERE name = 'Admin';

-- Verify the update
SELECT 
  p.id,
  p.name,
  p.email as profile_email,
  u.email as auth_email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.name = 'Admin';
