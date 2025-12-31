-- Step 1: Create conversations and messages tables (incremental approach)
-- This DOES NOT touch the existing offers table
-- Run this first, then we'll test before proceeding

BEGIN;

-- 1) Conversations table (replaces threads)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'BLOCKED', 'CLOSED')),
  context JSONB, -- snapshot of listing title, price at creation
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_last_read_at TIMESTAMPTZ,
  seller_last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one conversation per buyer+listing
  CONSTRAINT conversations_unique_buyer_listing UNIQUE (listing_id, buyer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON public.conversations(seller_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status) WHERE status = 'ACTIVE';

-- 2) Messages table (timeline items in conversations)
CREATE TABLE IF NOT EXISTS public.messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null for system messages
  type TEXT NOT NULL CHECK (type IN ('TEXT', 'IMAGE', 'SYSTEM', 'OFFER_CARD', 'PAYMENT_CARD')),
  body TEXT,
  metadata JSONB, -- structured payload: offer_id, order_id, image_url, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT messages_v2_body_or_metadata CHECK (body IS NOT NULL OR metadata IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_v2_conversation ON public.messages_v2(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_v2_sender ON public.messages_v2(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_v2_type ON public.messages_v2(type) WHERE type IN ('OFFER_CARD', 'PAYMENT_CARD');
CREATE INDEX IF NOT EXISTS idx_messages_v2_metadata_offer ON public.messages_v2 USING gin(metadata) WHERE type = 'OFFER_CARD';

-- 3) Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_v2 ENABLE ROW LEVEL SECURITY;

-- Conversations: visible to buyer and seller
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    auth.uid() = buyer_user_id OR auth.uid() = seller_user_id
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_user_id OR auth.uid() = seller_user_id
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE USING (
    auth.uid() = buyer_user_id OR auth.uid() = seller_user_id
  );

-- Messages: visible to conversation participants
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages_v2;
CREATE POLICY "Users can view conversation messages" ON public.messages_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages_v2.conversation_id
      AND (conversations.buyer_user_id = auth.uid() OR conversations.seller_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages_v2;
CREATE POLICY "Users can send messages" ON public.messages_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND (conversations.buyer_user_id = auth.uid() OR conversations.seller_user_id = auth.uid())
    )
    AND sender_user_id = auth.uid()
  );

-- 4) Trigger to maintain conversation metadata
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages_v2;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- 5) Helper view for conversation summaries
CREATE OR REPLACE VIEW public.conversation_summaries AS
SELECT
  c.id,
  c.listing_id,
  c.buyer_user_id,
  c.seller_user_id,
  c.status,
  c.context,
  c.last_message_at,
  c.buyer_last_read_at,
  c.seller_last_read_at,
  c.created_at,
  c.updated_at,
  (
    SELECT body
    FROM public.messages_v2 m
    WHERE m.conversation_id = c.id
    AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as last_message_preview,
  (
    SELECT COUNT(*)
    FROM public.offers o
    WHERE o.listing_id = c.listing_id
    AND (o.buyer_id = c.buyer_user_id OR o.seller_id = c.seller_user_id)
    AND o.status = 'pending'
  ) as pending_offers_count
FROM public.conversations c;

GRANT SELECT ON public.conversation_summaries TO authenticated, anon;

COMMIT;

-- Verification queries (run after this script succeeds):
-- SELECT COUNT(*) FROM conversations;
-- SELECT COUNT(*) FROM messages_v2;
-- SELECT * FROM conversation_summaries LIMIT 5;
