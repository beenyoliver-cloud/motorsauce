-- Create messaging system tables
-- Run this migration to set up the full messaging infrastructure

-- Threads table (stores conversations between two users)
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_ref UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT threads_participants_ordered CHECK (participant_1_id < participant_2_id)
);

-- Create unique index that treats NULL listing_ref as matching any thread without a listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_participants 
ON public.threads(participant_1_id, participant_2_id)
WHERE listing_ref IS NULL;

-- Create unique index for threads WITH a listing_ref
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_with_listing 
ON public.threads(participant_1_id, participant_2_id, listing_ref)
WHERE listing_ref IS NOT NULL;

-- Messages table (stores individual messages within threads)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'offer', 'system', 'review')),
  text_content TEXT,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  offer_amount_cents INTEGER,
  offer_currency TEXT DEFAULT 'GBP',
  offer_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thread read status (tracks which threads users have read)
CREATE TABLE IF NOT EXISTS public.thread_read_status (
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_unread BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (thread_id, user_id)
);

-- Thread deletions (soft-delete: hide threads per user)
CREATE TABLE IF NOT EXISTS public.thread_deletions (
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_deletions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
DROP POLICY IF EXISTS "Users can view their own threads" ON public.threads;
CREATE POLICY "Users can view their own threads" ON public.threads
  FOR SELECT USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

DROP POLICY IF EXISTS "Users can insert threads they participate in" ON public.threads;
CREATE POLICY "Users can insert threads they participate in" ON public.threads
  FOR INSERT WITH CHECK (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

DROP POLICY IF EXISTS "Users can update their own threads" ON public.threads;
CREATE POLICY "Users can update their own threads" ON public.threads
  FOR UPDATE USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
  );

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.messages;
CREATE POLICY "Users can view messages in their threads" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND (threads.participant_1_id = auth.uid() OR threads.participant_2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their threads" ON public.messages;
CREATE POLICY "Users can insert messages in their threads" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = thread_id
      AND (threads.participant_1_id = auth.uid() OR threads.participant_2_id = auth.uid())
    )
  );

-- RLS Policies for thread_read_status
DROP POLICY IF EXISTS "Users can view their own read status" ON public.thread_read_status;
CREATE POLICY "Users can view their own read status" ON public.thread_read_status
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own read status" ON public.thread_read_status;
CREATE POLICY "Users can manage their own read status" ON public.thread_read_status
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for thread_deletions
DROP POLICY IF EXISTS "Users can view their own deletions" ON public.thread_deletions;
CREATE POLICY "Users can view their own deletions" ON public.thread_deletions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own deletions" ON public.thread_deletions;
CREATE POLICY "Users can manage their own deletions" ON public.thread_deletions
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_threads_participant_1 ON public.threads(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_threads_participant_2 ON public.threads(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_threads_listing_ref ON public.threads(listing_ref);
CREATE INDEX IF NOT EXISTS idx_threads_last_message_at ON public.threads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_offer_id ON public.messages(offer_id) WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_thread_read_status_user_thread ON public.thread_read_status(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_deletions_user_thread ON public.thread_deletions(user_id, thread_id);

-- Trigger to update threads.updated_at and last_message_at when new message is inserted
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads
  SET 
    updated_at = NOW(),
    last_message_at = NEW.created_at,
    last_message_text = CASE 
      WHEN NEW.message_type = 'text' THEN NEW.text_content
      WHEN NEW.message_type = 'offer' THEN 'Sent an offer'
      WHEN NEW.message_type = 'system' THEN NEW.text_content
      ELSE 'New message'
    END
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON public.messages;
CREATE TRIGGER trigger_update_thread_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_message();
