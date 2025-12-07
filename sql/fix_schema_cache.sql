-- Fix schema cache issue by refreshing RPC functions
-- Run this in Supabase SQL Editor to clear any stale references

-- Drop old create_offer variants completely
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_offer(uuid, uuid, integer) CASCADE;

-- Verify only create_offer_uuid exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'create_offer%'
ORDER BY routine_name;
