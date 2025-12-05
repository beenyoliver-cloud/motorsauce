-- ⚠️  WARNING: This will DELETE ALL messages, threads, and related data
-- This action CANNOT be undone
-- Run this in Supabase SQL Editor to clear all messaging data

-- Step 1: Delete all thread read status records
DELETE FROM public.thread_read_status;

-- Step 2: Delete all thread deletion records  
DELETE FROM public.thread_deletions;

-- Step 3: Delete all messages
DELETE FROM public.messages;

-- Step 4: Delete all threads
DELETE FROM public.threads;

-- Step 5: If you have a notifications table, clear it (uncomment if needed)
-- DELETE FROM public.notifications;

-- Verify the cleanup
SELECT 
  'messages' as table_name, 
  COUNT(*) as remaining_records 
FROM public.messages
UNION ALL
SELECT 
  'threads' as table_name, 
  COUNT(*) as remaining_records 
FROM public.threads
UNION ALL
SELECT 
  'thread_read_status' as table_name, 
  COUNT(*) as remaining_records 
FROM public.thread_read_status
UNION ALL
SELECT 
  'thread_deletions' as table_name, 
  COUNT(*) as remaining_records 
FROM public.thread_deletions;

-- Expected result: All counts should be 0
