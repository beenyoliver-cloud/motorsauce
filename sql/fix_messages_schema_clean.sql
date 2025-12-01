-- Clean fix for messages table schema compatibility
-- This handles ONLY the actual columns: content (legacy) and text_content (new)
-- Run this in Supabase SQL Editor

-- Step 1: Drop NOT NULL constraint from legacy 'content' column if it exists
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
    RAISE NOTICE 'Dropped NOT NULL constraint from messages.content';
  ELSE
    RAISE NOTICE 'messages.content is already nullable or does not exist';
  END IF;
END $$;

-- Step 2: Ensure text_content column exists (from new schema)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Step 3: Backfill data between content and text_content columns
DO $$
BEGIN
  -- Check if content column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content' AND table_schema = 'public'
  ) THEN
    -- Backfill text_content from content if needed
    UPDATE public.messages 
    SET text_content = content
    WHERE text_content IS NULL AND content IS NOT NULL;
    
    -- Backfill content from text_content for legacy compatibility
    UPDATE public.messages 
    SET content = text_content 
    WHERE content IS NULL AND text_content IS NOT NULL;
    
    RAISE NOTICE 'Synced data between content and text_content columns';
  END IF;
END $$;

-- Step 4: Create trigger to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync text_content to content and vice versa
  -- Only works if both columns exist
  BEGIN
    IF NEW.text_content IS NOT NULL THEN
      NEW.content := NEW.text_content;
    ELSIF NEW.content IS NOT NULL THEN
      NEW.text_content := NEW.content;
    END IF;
  EXCEPTION 
    WHEN undefined_column THEN NULL; -- Ignore if content column doesn't exist
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_message_content ON public.messages;
CREATE TRIGGER trg_sync_message_content
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_message_content();

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Messages schema fixed: content (legacy) and text_content (new) are now compatible';
END $$;
