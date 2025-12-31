-- Reset messaging to a clean slate (no backfill)
-- Run this in Supabase SQL editor or psql. It will:
--  1) Delete all messaging data
--  2) Drop legacy columns (a_user/b_user)
--  3) Enforce the new participant_1_id/participant_2_id schema and indexes
--  4) Recreate the hardening trigger/view so new threads work cleanly
-- ⚠️  This is destructive and irreversible.

BEGIN;

-- 1) Wipe data
TRUNCATE TABLE
  public.thread_read_status,
  public.thread_deletions,
  public.messages,
  public.threads
RESTART IDENTITY CASCADE;

-- 2) Drop legacy participant columns if they still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'threads' AND column_name = 'a_user'
  ) THEN
    ALTER TABLE public.threads DROP COLUMN a_user;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'threads' AND column_name = 'b_user'
  ) THEN
    ALTER TABLE public.threads DROP COLUMN b_user;
  END IF;
END $$;

-- 3) Ensure new participant columns and ordering constraint
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS participant_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS participant_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS listing_ref UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_type TEXT,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ALTER COLUMN participant_1_id DROP DEFAULT,
  ALTER COLUMN participant_2_id DROP DEFAULT;

-- Enforce ordering (only safe now that table is empty)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'threads_participants_ordered' AND conrelid = 'public.threads'::regclass
  ) THEN
    ALTER TABLE public.threads DROP CONSTRAINT threads_participants_ordered;
  END IF;
  ALTER TABLE public.threads ADD CONSTRAINT threads_participants_ordered CHECK (participant_1_id < participant_2_id);
END $$;

ALTER TABLE public.threads
  ALTER COLUMN participant_1_id SET NOT NULL,
  ALTER COLUMN participant_2_id SET NOT NULL;

-- 4) Recreate canonical unique indexes
DROP INDEX IF EXISTS idx_threads_unique_participants;
DROP INDEX IF EXISTS idx_threads_unique_null_listing;
DROP INDEX IF EXISTS idx_threads_unique_with_listing;
CREATE UNIQUE INDEX idx_threads_unique_null_listing
  ON public.threads(participant_1_id, participant_2_id)
  WHERE listing_ref IS NULL;
CREATE UNIQUE INDEX idx_threads_unique_with_listing
  ON public.threads(participant_1_id, participant_2_id, listing_ref)
  WHERE listing_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_last_message_at_desc
  ON public.threads(last_message_at DESC);

-- 5) Ensure messages schema is aligned (no backfill needed because table is empty)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS offer_currency TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS offer_status TEXT,
  ALTER COLUMN from_user_id DROP DEFAULT;

ALTER TABLE public.messages
  ALTER COLUMN from_user_id SET NOT NULL,
  ALTER COLUMN message_type SET NOT NULL,
  ALTER COLUMN message_type SET DEFAULT 'text';

-- Keep the length check
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_text_length;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_text_length CHECK (text_content IS NULL OR char_length(text_content) <= 2000);

-- 6) Refresh trigger to keep thread summaries in sync
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

-- 7) Rebuild lightweight summaries view
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

COMMIT;
