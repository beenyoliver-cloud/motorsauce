-- First, find your user ID by checking the profiles table
-- Replace 'your-email@example.com' with your actual email
SELECT id, name, email FROM public.profiles WHERE email = 'your-email@example.com';

-- Once you have your user ID, insert it into the admins table
-- Replace 'your-user-id-here' with the actual UUID from the query above
INSERT INTO public.admins (id) VALUES ('your-user-id-here');

-- Or, if you want to make a user admin by their email in one step:
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.admins (id)
SELECT id FROM public.profiles WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO NOTHING;
