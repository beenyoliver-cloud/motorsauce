-- Diagnostic queries to check offers table structure
-- Run these in Supabase SQL Editor to diagnose the issue

-- 1. Check what columns exist in offers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check a sample offer to see actual data
SELECT * FROM public.offers LIMIT 1;

-- 3. Check if respond_offer function exists
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'respond_offer';

-- 4. Test the RPC with explicit parameters (replace UUID with a real offer ID)
-- This will show the exact error message
SELECT respond_offer(
  'abc9bb6c-436d-4c96-b0a3-1b7b5365a5da'::uuid,
  'accepted'::text,
  NULL::integer
);
