-- Fix messages.content NOT NULL constraint
-- Run this in Supabase SQL Editor

-- Drop NOT NULL constraint from legacy 'content' column if it exists
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

-- Drop NOT NULL constraint from legacy 'text' column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'text' 
    AND table_schema = 'public' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.messages ALTER COLUMN text DROP NOT NULL;
    RAISE NOTICE 'Dropped NOT NULL constraint from messages.text';
  ELSE
    RAISE NOTICE 'messages.text is already nullable or does not exist';
  END IF;
END $$;

-- Ensure text_content column exists (from new schema)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Backfill text_content from content if needed
UPDATE public.messages 
SET text_content = COALESCE(text_content, content, text)
WHERE text_content IS NULL;

-- Backfill content from text_content for legacy compatibility
UPDATE public.messages 
SET content = text_content 
WHERE content IS NULL AND text_content IS NOT NULL;

-- Create trigger to sync legacy columns when inserting via new schema
CREATE OR REPLACE FUNCTION sync_legacy_message_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync text_content to legacy columns
  IF NEW.text_content IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR NEW.content IS NULL THEN
      NEW.content := NEW.text_content;
    END IF;
    IF TG_OP = 'INSERT' OR NEW.text IS NULL THEN
      NEW.text := NEW.text_content;
    END IF;
  END IF;
  
  -- Sync legacy columns to text_content if text_content is NULL
  IF NEW.text_content IS NULL AND NEW.content IS NOT NULL THEN
    NEW.text_content := NEW.content;
    IF NEW.text IS NULL THEN
      NEW.text := NEW.content;
    END IF;
  END IF;
  
  IF NEW.text_content IS NULL AND NEW.text IS NOT NULL THEN
    NEW.text_content := NEW.text;
    IF NEW.content IS NULL THEN
      NEW.content := NEW.text;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_legacy_message_columns ON public.messages;
CREATE TRIGGER trg_sync_legacy_message_columns
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_message_columns();

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
  AND column_name IN ('content', 'text', 'text_content', 'sender', 'from_user_id')
ORDER BY column_name;

-- Test query to show current messages schema
SELECT 
  'Total messages: ' || COUNT(*)::text as info
FROM public.messages;
