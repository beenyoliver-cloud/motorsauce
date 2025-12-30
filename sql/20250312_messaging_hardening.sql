-- Messaging hardening migration
-- This migration tightens constraints, adds summary columns, and refreshes triggers
-- to keep threads resilient long-term.

-- 1) Ensure deterministic uniqueness for threads (with and without listing_ref)
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_null_listing
  ON public.threads(participant_1_id, participant_2_id)
  WHERE listing_ref IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_with_listing
  ON public.threads(participant_1_id, participant_2_id, listing_ref)
  WHERE listing_ref IS NOT NULL;

-- 2) Add summary columns to threads for faster reads
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS last_message_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_type TEXT,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- 3) Enforce sane message payloads
ALTER TABLE public.messages
  ADD CONSTRAINT messages_text_length CHECK (text_content IS NULL OR char_length(text_content) <= 2000);

-- Optional: normalize message_type values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_kind') THEN
    CREATE TYPE message_kind AS ENUM ('text', 'offer', 'system', 'review');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only add the cast if column exists and is not already of the new type.
-- Drop the existing default (text) first to avoid cast errors, then restore it.
DO $$
DECLARE
  v_type TEXT;
  rec RECORD;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type';

  IF v_type IS NOT NULL AND v_type <> 'USER-DEFINED' THEN
    -- Drop any existing CHECK constraints referencing message_type to avoid operator mismatches
    FOR rec IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.messages'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%message_type%'
    LOOP
      EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS %I', rec.conname);
    END LOOP;

    -- Remove default to allow type change
    EXECUTE 'ALTER TABLE public.messages ALTER COLUMN message_type DROP DEFAULT';

    -- Ensure all values are valid enum strings; if not, set to 'text'
    UPDATE public.messages
      SET message_type = 'text'
      WHERE (message_type::text) NOT IN ('text','offer','system','review') OR message_type IS NULL;

    -- Perform type change
    EXECUTE 'ALTER TABLE public.messages ALTER COLUMN message_type TYPE message_kind USING (message_type::text)::message_kind';

    -- Restore default as enum
    EXECUTE 'ALTER TABLE public.messages ALTER COLUMN message_type SET DEFAULT ''text''::message_kind';
  END IF;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE NOTICE 'Skipping message_type cast due to invalid data; please clean message_type values manually.';
END $$;

-- 4) Trigger to keep thread summary columns fresh on new messages
CREATE OR REPLACE FUNCTION public.update_thread_on_message_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_preview TEXT;
BEGIN
  v_preview := COALESCE(
    CASE WHEN NEW.text_content IS NOT NULL THEN LEFT(TRIM(NEW.text_content), 120) END,
    CASE WHEN NEW.message_type = 'offer' THEN 'Sent an offer' END,
    CASE WHEN NEW.message_type = 'system' THEN LEFT(TRIM(COALESCE(NEW.text_content, 'System message')), 120) END,
    'New message'
  );

  UPDATE public.threads
  SET
    updated_at = NOW(),
    last_message_at = COALESCE(NEW.created_at, NOW()),
    last_message_text = v_preview,
    last_message_id = NEW.id,
    last_message_user_id = NEW.from_user_id,
    last_message_type = NEW.message_type,
    last_message_preview = v_preview
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON public.messages;
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_on_message_v2();

-- 5) Helpful index for last_message_at
CREATE INDEX IF NOT EXISTS idx_threads_last_message_at_desc
  ON public.threads(last_message_at DESC);

-- 6) Lightweight view for thread summaries (participants, last message)
CREATE OR REPLACE VIEW public.thread_summaries AS
SELECT
  t.id,
  t.participant_1_id,
  t.participant_2_id,
  t.listing_ref,
  t.last_message_id,
  t.last_message_user_id,
  t.last_message_type,
  t.last_message_preview,
  t.last_message_at,
  t.created_at,
  t.updated_at
FROM public.threads t;

GRANT SELECT ON public.thread_summaries TO authenticated, anon;
