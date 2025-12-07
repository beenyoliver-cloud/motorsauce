-- Completely drop ALL create_offer variants to prevent schema cache confusion
-- This will force Supabase to use ONLY create_offer_uuid

-- Drop all possible variations of create_offer (not create_offer_uuid)
DROP FUNCTION IF EXISTS public.create_offer() CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text, text, text) CASCADE;

-- Verify ONLY create_offer_uuid remains
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'create_offer%'
ORDER BY routine_name;
