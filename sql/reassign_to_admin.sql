-- Step 1: Find the Admin user ID
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@motorsauce.dev';

-- Step 2: Check if Admin has a profile (copy the ID from Step 1 result)
SELECT * 
FROM public.profiles 
WHERE id = 'PASTE_ADMIN_ID_HERE';

-- Step 3: If no profile exists, create one (replace PASTE_ADMIN_ID_HERE with actual ID from Step 1)
INSERT INTO public.profiles (id, name, email, created_at, updated_at)
VALUES (
  'PASTE_ADMIN_ID_HERE',
  'Admin',
  'admin@motorsauce.dev',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Step 4: Update ALL listings to use the Admin as seller
UPDATE public.listings
SET seller_id = 'PASTE_ADMIN_ID_HERE';

-- Step 5: Verify the changes
SELECT COUNT(*) as total_listings 
FROM public.listings 
WHERE seller_id = 'PASTE_ADMIN_ID_HERE';

SELECT l.id, l.title, l.seller_id, p.name as seller_name
FROM public.listings l
LEFT JOIN public.profiles p ON l.seller_id = p.id
LIMIT 5;
