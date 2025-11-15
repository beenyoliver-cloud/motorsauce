-- Complete messaging system with persistence, user isolation, soft deletes, and archival
-- Run this in your Supabase SQL editor

-- ==================== THREADS TABLE ====================
-- Stores conversation threads between two users
CREATE TABLE IF NOT EXISTS public.threads (
  id TEXT PRIMARY KEY,                    -- Format: t_{slug1}_{slug2}_{optional_listing_ref}
  participant_1_id UUID NOT NULL,         -- First user (sorted by UUID for consistency)
  participant_2_id UUID NOT NULL,         -- Second user
  listing_ref TEXT,                       -- Optional reference to listing ID
  last_message_text TEXT,                 -- Preview of last message
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT threads_participants_ordered CHECK (participant_1_id < participant_2_id),
  CONSTRAINT threads_participants_different CHECK (participant_1_id != participant_2_id),
  
  -- Indexes
  CONSTRAINT threads_participants_unique UNIQUE (participant_1_id, participant_2_id, listing_ref)
);

CREATE INDEX IF NOT EXISTS idx_threads_participant_1 ON public.threads(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_threads_participant_2 ON public.threads(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON public.threads(last_message_at DESC);

-- ==================== MESSAGES TABLE ====================
-- Stores individual messages within threads
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,             -- Who sent the message
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'offer', 'system'
  text_content TEXT,                      -- Message text (for text/system messages)
  
  -- Offer-specific fields (when message_type = 'offer')
  offer_id UUID,                          -- Reference to offers table
  offer_amount_cents INTEGER,             -- Amount in cents
  offer_currency TEXT DEFAULT 'GBP',
  offer_status TEXT,                      -- 'pending', 'accepted', 'declined', 'countered', 'withdrawn'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'offer', 'system')),
  CONSTRAINT messages_text_or_offer CHECK (
    (message_type = 'text' AND text_content IS NOT NULL) OR
    (message_type = 'system' AND text_content IS NOT NULL) OR
    (message_type = 'offer' AND offer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_offer ON public.messages(offer_id) WHERE offer_id IS NOT NULL;

-- ==================== THREAD_DELETIONS TABLE ====================
-- Tracks which users have "deleted" (hidden) a thread locally
-- Thread only archives after both users delete; purges after 30 days
CREATE TABLE IF NOT EXISTS public.thread_deletions (
  thread_id TEXT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_deletions_user ON public.thread_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_deletions_date ON public.thread_deletions(deleted_at);

-- ==================== THREAD_READ_STATUS TABLE ====================
-- Tracks which threads each user has read (for unread counts)
CREATE TABLE IF NOT EXISTS public.thread_read_status (
  thread_id TEXT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_read_status_user ON public.thread_read_status(user_id);

-- ==================== OFFERS TABLE ====================
-- Stores offer details separately for querying and status tracking
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,               -- Reference to listing
  listing_title TEXT,
  listing_image TEXT,
  
  starter_id UUID NOT NULL,               -- User who initiated the offer
  recipient_id UUID NOT NULL,             -- User receiving the offer
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT offers_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired')),
  CONSTRAINT offers_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT offers_participants_different CHECK (starter_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_thread ON public.offers(thread_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_starter ON public.offers(starter_id);
CREATE INDEX IF NOT EXISTS idx_offers_recipient ON public.offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

-- ==================== RLS POLICIES ====================

-- Enable RLS on all tables
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- THREADS: Users can see threads they're part of (unless they've deleted them)
DROP POLICY IF EXISTS "Users can view their own threads" ON public.threads;
CREATE POLICY "Users can view their own threads"
  ON public.threads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (participant_1_id, participant_2_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.thread_deletions
      WHERE thread_deletions.thread_id = threads.id
      AND thread_deletions.user_id = auth.uid()
    )
  );

-- THREADS: Users can create threads they're part of
DROP POLICY IF EXISTS "Users can create threads they participate in" ON public.threads;
CREATE POLICY "Users can create threads they participate in"
  ON public.threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (participant_1_id, participant_2_id));

-- THREADS: Users can update threads they're part of (for last_message updates)
DROP POLICY IF EXISTS "Users can update their threads" ON public.threads;
CREATE POLICY "Users can update their threads"
  ON public.threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (participant_1_id, participant_2_id))
  WITH CHECK (auth.uid() IN (participant_1_id, participant_2_id));

-- MESSAGES: Users can see messages in their threads (unless thread is deleted)
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.messages;
CREATE POLICY "Users can view messages in their threads"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND auth.uid() IN (threads.participant_1_id, threads.participant_2_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.thread_deletions
        WHERE thread_deletions.thread_id = threads.id
        AND thread_deletions.user_id = auth.uid()
      )
    )
  );

-- MESSAGES: Users can create messages in threads they're part of
DROP POLICY IF EXISTS "Users can create messages in their threads" ON public.messages;
CREATE POLICY "Users can create messages in their threads"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND auth.uid() IN (threads.participant_1_id, threads.participant_2_id)
    )
  );

-- MESSAGES: Users can update their own messages (e.g., offer status changes)
DROP POLICY IF EXISTS "Users can update messages in their threads" ON public.messages;
CREATE POLICY "Users can update messages in their threads"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND auth.uid() IN (threads.participant_1_id, threads.participant_2_id)
    )
  );

-- THREAD_DELETIONS: Users can only manage their own deletions
DROP POLICY IF EXISTS "Users can manage their thread deletions" ON public.thread_deletions;
CREATE POLICY "Users can manage their thread deletions"
  ON public.thread_deletions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- THREAD_READ_STATUS: Users can only manage their own read status
DROP POLICY IF EXISTS "Users can manage their read status" ON public.thread_read_status;
CREATE POLICY "Users can manage their read status"
  ON public.thread_read_status
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- OFFERS: Users can see offers in their threads
DROP POLICY IF EXISTS "Users can view offers in their threads" ON public.offers;
CREATE POLICY "Users can view offers in their threads"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (starter_id, recipient_id)
  );

-- OFFERS: Users can create offers they're starting
DROP POLICY IF EXISTS "Users can create their own offers" ON public.offers;
CREATE POLICY "Users can create their own offers"
  ON public.offers
  FOR INSERT
  TO authenticated
  WITH CHECK (starter_id = auth.uid());

-- OFFERS: Users can update offers they're part of
DROP POLICY IF EXISTS "Users can update offers they are part of" ON public.offers;
CREATE POLICY "Users can update offers they are part of"
  ON public.offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (starter_id, recipient_id))
  WITH CHECK (auth.uid() IN (starter_id, recipient_id));

-- ==================== HELPER FUNCTIONS ====================

-- Function to update thread's last_message when a new message is added
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads
  SET 
    last_message_text = CASE
      WHEN NEW.message_type = 'text' THEN NEW.text_content
      WHEN NEW.message_type = 'offer' THEN 'Offer: £' || (NEW.offer_amount_cents::float / 100)::text
      WHEN NEW.message_type = 'system' THEN NEW.text_content
      ELSE 'New message'
    END,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_last_message ON public.messages;
CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Function to archive threads deleted by both users for 30+ days
CREATE OR REPLACE FUNCTION archive_fully_deleted_threads()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
BEGIN
  -- Delete threads where both participants have deleted AND it's been 30+ days since the last deletion
  DELETE FROM public.threads
  WHERE id IN (
    SELECT t.id
    FROM public.threads t
    INNER JOIN public.thread_deletions d1 ON d1.thread_id = t.id AND d1.user_id = t.participant_1_id
    INNER JOIN public.thread_deletions d2 ON d2.thread_id = t.id AND d2.user_id = t.participant_2_id
    WHERE GREATEST(d1.deleted_at, d2.deleted_at) < NOW() - INTERVAL '30 days'
  );
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- You can run this periodically via a cron job or scheduled function:
-- SELECT archive_fully_deleted_threads();

-- ==================== VERIFICATION ====================

-- Verify tables exist
SELECT 
  schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('threads', 'messages', 'thread_deletions', 'thread_read_status', 'offers')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('threads', 'messages', 'thread_deletions', 'thread_read_status', 'offers')
ORDER BY tablename;

COMMENT ON TABLE public.threads IS 'Conversation threads between two users with soft-delete support';
COMMENT ON TABLE public.messages IS 'Individual messages within threads (text, offers, system)';
COMMENT ON TABLE public.thread_deletions IS 'Tracks local deletion by users; thread archives after both delete for 30+ days';
COMMENT ON TABLE public.thread_read_status IS 'Tracks read status per user for unread badge counts';
COMMENT ON TABLE public.offers IS 'Offer details with status tracking for buyer-seller negotiations';
