-- Drop the old create_offer RPC to prevent duplicate creation
-- We now use create_offer_uuid which is more specific and handles metadata

DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text, text, text);
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer);

-- Verify create_offer_uuid exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'create_offer%'
ORDER BY routine_name;
