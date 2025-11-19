-- Quick fix for messaging system constraint error
-- Run this in Supabase SQL Editor to fix the "no unique or exclusion constraint" error

-- Add the unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'threads_participants_unique'
  ) THEN
    ALTER TABLE public.threads 
    ADD CONSTRAINT threads_participants_unique 
    UNIQUE (participant_1_id, participant_2_id, listing_ref);
    RAISE NOTICE 'Added threads_participants_unique constraint';
  ELSE
    RAISE NOTICE 'Constraint threads_participants_unique already exists';
  END IF;
END $$;

-- Add the ordered constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'threads_participants_ordered'
  ) THEN
    ALTER TABLE public.threads 
    ADD CONSTRAINT threads_participants_ordered 
    CHECK (participant_1_id < participant_2_id);
    RAISE NOTICE 'Added threads_participants_ordered constraint';
  ELSE
    RAISE NOTICE 'Constraint threads_participants_ordered already exists';
  END IF;
END $$;

-- Add the different constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'threads_participants_different'
  ) THEN
    ALTER TABLE public.threads 
    ADD CONSTRAINT threads_participants_different 
    CHECK (participant_1_id != participant_2_id);
    RAISE NOTICE 'Added threads_participants_different constraint';
  ELSE
    RAISE NOTICE 'Constraint threads_participants_different already exists';
  END IF;
END $$;

-- Verify constraints exist
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.threads'::regclass
  AND conname LIKE 'threads_%'
ORDER BY conname;
