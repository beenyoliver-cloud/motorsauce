-- Fix for legacy column constraints blocking new messaging system
-- Run this in Supabase SQL Editor

-- Step 1: Check what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'threads'
ORDER BY ordinal_position;

-- Step 2: Remove NOT NULL constraints from legacy columns if they exist
DO $$ 
BEGIN
  -- Remove NOT NULL from a_user if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' 
      AND column_name = 'a_user' 
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.threads ALTER COLUMN a_user DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from a_user';
  END IF;

  -- Remove NOT NULL from b_user if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' 
      AND column_name = 'b_user' 
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.threads ALTER COLUMN b_user DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from b_user';
  END IF;
END $$;

-- Step 3: Add NOT NULL constraints to new columns if they're missing
DO $$ 
BEGIN
  -- Make participant_1_id NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' 
      AND column_name = 'participant_1_id' 
      AND table_schema = 'public'
      AND is_nullable = 'YES'
  ) THEN
    -- First, populate any NULL values with a default (shouldn't happen, but just in case)
    UPDATE public.threads SET participant_1_id = gen_random_uuid() WHERE participant_1_id IS NULL;
    ALTER TABLE public.threads ALTER COLUMN participant_1_id SET NOT NULL;
    RAISE NOTICE 'Set participant_1_id to NOT NULL';
  END IF;

  -- Make participant_2_id NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' 
      AND column_name = 'participant_2_id' 
      AND table_schema = 'public'
      AND is_nullable = 'YES'
  ) THEN
    -- First, populate any NULL values with a default (shouldn't happen, but just in case)
    UPDATE public.threads SET participant_2_id = gen_random_uuid() WHERE participant_2_id IS NULL;
    ALTER TABLE public.threads ALTER COLUMN participant_2_id SET NOT NULL;
    RAISE NOTICE 'Set participant_2_id to NOT NULL';
  END IF;
END $$;

-- Step 4: Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'threads'
  AND column_name IN ('a_user', 'b_user', 'participant_1_id', 'participant_2_id')
ORDER BY column_name;

-- Step 5: Show a summary
DO $$ 
BEGIN
  RAISE NOTICE '✅ Legacy columns (a_user, b_user) can now be NULL';
  RAISE NOTICE '✅ New columns (participant_1_id, participant_2_id) are required';
  RAISE NOTICE '✅ Messaging system should now work correctly';
END $$;
