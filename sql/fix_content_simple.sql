-- SIMPLIFIED: Fix messages content column constraint
-- Run this in Supabase SQL Editor
-- This version safely handles columns that may or may not exist

-- Step 1: Drop NOT NULL constraint from 'content' column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'content' 
    AND table_schema = 'public' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
    RAISE NOTICE '✓ Dropped NOT NULL constraint from messages.content';
  ELSE
    RAISE NOTICE '✓ messages.content is already nullable or does not exist';
  END IF;
END $$;

-- Step 2: Ensure text_content column exists (the new schema column)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Step 3: Backfill text_content from content (only if content exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content' AND table_schema = 'public'
  ) THEN
    EXECUTE 'UPDATE public.messages SET text_content = content WHERE text_content IS NULL AND content IS NOT NULL';
    RAISE NOTICE '✓ Backfilled text_content from content';
  END IF;
END $$;

-- Step 4: Create a simple trigger to keep columns in sync
CREATE OR REPLACE FUNCTION sync_message_content()
RETURNS TRIGGER AS $$
DECLARE
  has_content boolean;
BEGIN
  -- Check if content column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content' AND table_schema = 'public'
  ) INTO has_content;
  
  -- Only sync if content column exists
  IF has_content THEN
    IF NEW.text_content IS NOT NULL THEN
      NEW.content := NEW.text_content;
    ELSIF NEW.content IS NOT NULL THEN
      NEW.text_content := NEW.content;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_message_content ON public.messages;
CREATE TRIGGER trg_sync_message_content
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_message_content();

-- Step 5: Verify the setup
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  CASE 
    WHEN is_nullable = 'YES' THEN '✓ Nullable'
    ELSE '✗ NOT NULL'
  END as status
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
  AND column_name IN ('content', 'text_content', 'sender', 'from_user_id')
ORDER BY column_name;
