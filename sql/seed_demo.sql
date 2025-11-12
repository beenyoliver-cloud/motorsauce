-- sql/seed_demo.sql
-- Demo seed for local development. Read instructions below before running.

-- IMPORTANT:
-- 1) `public.profiles.id` references `auth.users(id)`. You must use an existing
--    Supabase auth user id for SELLER_ID. Create a user via Supabase Dashboard
--    (Authentication -> Users) or sign up using the app, then copy the user's id.
-- 2) Do NOT paste service keys into this file. Run it in the Supabase SQL editor.

-- Replace the string <REPLACE_WITH_SELLER_ID> with a real auth.users.id (UUID).
-- Example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

BEGIN;

-- Optional: verify the listings table exists
-- SELECT to show current rows (run separately if you like)
-- SELECT count(*) FROM public.listings;

-- Sample listing 1
INSERT INTO public.listings (
  id, seller_id, title, description, price, condition, category, make, model, year, images, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'fef3849c-7d57-49e7-84a9-89de0c7d0995',
  'Demo Brake Pads',
  'Good condition demo brake pads, fits many models.',
  29.99,
  'Used - Good',
  'Aftermarket',
  'Toyota',
  'Corolla',
  2012,
  '[/images/placeholder.jpg]'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
);

-- Sample listing 2
INSERT INTO public.listings (
  id, seller_id, title, description, price, condition, category, make, model, year, images, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '<REPLACE_WITH_SELLER_ID>',
  'OEM Oil Filter',
  'Genuine OEM oil filter. New in box.',
  12.5,
  'New',
  'OEM',
  'Honda',
  'Civic',
  2018,
  '[/images/placeholder.jpg]'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
);

COMMIT;

-- Quick verification queries (run after the inserts):
-- SELECT id, title, price, make, model, created_at FROM public.listings ORDER BY created_at DESC LIMIT 10;
-- SELECT count(*) FROM public.listings;

-- Notes:
-- - If the INSERT fails with a foreign key error referencing auth.users, it means the
--   seller id you used doesn't exist in auth.users. Create or locate a user in the
--   Supabase dashboard and use their id.
-- - This file intentionally does NOT attempt to create auth.users rows; that should
--   be done through Supabase Auth (dashboard or API) to ensure proper auth setup.
