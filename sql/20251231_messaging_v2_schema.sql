-- Messaging V2 Schema
-- Complete rewrite of messaging system with proper offer negotiation and transaction flow
-- This replaces the previous threads/messages schema with conversations/messages/offers

BEGIN;

-- Drop old messaging tables (backup first if needed)
DROP TABLE IF EXISTS public.thread_read_status CASCADE;
DROP TABLE IF EXISTS public.thread_deletions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
DROP VIEW IF EXISTS public.thread_summaries CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_on_message_v2() CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_on_message() CASCADE;

-- 1) Conversations table (replaces threads)
-- Represents a negotiation/chat between buyer and seller about a listing
CREATE TABLE public.conversations (
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

CREATE INDEX idx_conversations_buyer ON public.conversations(buyer_user_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON public.conversations(seller_user_id, last_message_at DESC);
CREATE INDEX idx_conversations_listing ON public.conversations(listing_id);
CREATE INDEX idx_conversations_status ON public.conversations(status) WHERE status = 'ACTIVE';

-- 2) Messages table (timeline items in conversations)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null for system messages
  type TEXT NOT NULL CHECK (type IN ('TEXT', 'IMAGE', 'SYSTEM', 'OFFER_CARD', 'PAYMENT_CARD')),
  body TEXT,
  metadata JSONB, -- structured payload: offer_id, order_id, image_url, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT messages_body_or_metadata CHECK (body IS NOT NULL OR metadata IS NOT NULL)
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_user_id);
CREATE INDEX idx_messages_type ON public.messages(type) WHERE type IN ('OFFER_CARD', 'PAYMENT_CARD');
CREATE INDEX idx_messages_metadata_offer ON public.messages USING gin(metadata) WHERE type = 'OFFER_CARD';

-- 3) Offers table (structured negotiation objects)
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Offer terms
  currency TEXT NOT NULL DEFAULT 'GBP',
  amount INTEGER NOT NULL CHECK (amount > 0), -- minor units (pennies)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  shipping_option_id UUID, -- optional reference to shipping options
  expires_at TIMESTAMPTZ,
  
  -- State management
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED')),
  parent_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL, -- links counter-offers
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT offers_amount_reasonable CHECK (amount <= 1000000000) -- £10M max
);

CREATE INDEX idx_offers_conversation ON public.offers(conversation_id, created_at DESC);
CREATE INDEX idx_offers_listing ON public.offers(listing_id);
CREATE INDEX idx_offers_status ON public.offers(status) WHERE status = 'PENDING';
CREATE INDEX idx_offers_created_by ON public.offers(created_by_user_id);
CREATE INDEX idx_offers_offered_to ON public.offers(offered_to_user_id);
CREATE INDEX idx_offers_parent ON public.offers(parent_offer_id) WHERE parent_offer_id IS NOT NULL;

-- Prevent multiple active offers in same conversation (recommended for clean UX)
CREATE UNIQUE INDEX idx_offers_one_pending_per_conversation 
  ON public.offers(conversation_id) 
  WHERE status = 'PENDING';

-- 4) Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
CREATE POLICY "Users can view conversation messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_user_id = auth.uid() OR conversations.seller_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND (conversations.buyer_user_id = auth.uid() OR conversations.seller_user_id = auth.uid())
    )
    AND sender_user_id = auth.uid()
  );

-- Offers: visible to conversation participants
DROP POLICY IF EXISTS "Users can view offers" ON public.offers;
CREATE POLICY "Users can view offers" ON public.offers
  FOR SELECT USING (
    auth.uid() = created_by_user_id OR auth.uid() = offered_to_user_id
  );

DROP POLICY IF EXISTS "Users can create offers" ON public.offers;
CREATE POLICY "Users can create offers" ON public.offers
  FOR INSERT WITH CHECK (
    auth.uid() = created_by_user_id
  );

DROP POLICY IF EXISTS "Users can update their offers" ON public.offers;
CREATE POLICY "Users can update their offers" ON public.offers
  FOR UPDATE USING (
    auth.uid() = created_by_user_id OR auth.uid() = offered_to_user_id
  );

-- 5) Triggers to maintain conversation metadata
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

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- 6) Helper view for conversation summaries (with last message preview)
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
    FROM public.messages m
    WHERE m.conversation_id = c.id
    AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as last_message_preview,
  (
    SELECT COUNT(*)
    FROM public.offers o
    WHERE o.conversation_id = c.id
    AND o.status = 'PENDING'
  ) as pending_offers_count
FROM public.conversations c;

GRANT SELECT ON public.conversation_summaries TO authenticated, anon;

-- 7) Function to expire old pending offers (run via cron/scheduler)
CREATE OR REPLACE FUNCTION public.expire_old_offers()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.offers
  SET 
    status = 'EXPIRED',
    updated_at = NOW()
  WHERE status = 'PENDING'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
