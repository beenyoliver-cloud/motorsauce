-- Diagnostic query to check offers and threads schema
-- Run this to see if all required columns exist

-- Check threads table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'threads'
ORDER BY ordinal_position;

-- Check offers table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'offers'
ORDER BY ordinal_position;

-- Check messages table offer columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name LIKE '%offer%'
ORDER BY ordinal_position;

-- Check RLS policies on offers
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'offers';

-- Check RLS policies on threads
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'threads';

-- Test if you can see any existing offers
SELECT id, listing_id, starter_id, recipient_id, amount_cents, status, created_at
FROM offers
ORDER BY created_at DESC
LIMIT 5;
