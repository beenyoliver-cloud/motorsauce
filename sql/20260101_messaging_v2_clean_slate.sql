-- Messaging V2 clean slate (destructive)
-- Recreates conversations, messages_v2, offers with typed conversations (LISTING/DIRECT)
-- Run only when you are OK wiping legacy messaging/offers data

BEGIN;

-- Drop legacy artifacts
DROP VIEW IF EXISTS public.conversation_summaries CASCADE;
DROP VIEW IF EXISTS public.thread_summaries CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_on_message_v2() CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_on_message() CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_offers() CASCADE;

DROP TABLE IF EXISTS public.thread_read_status CASCADE;
DROP TABLE IF EXISTS public.thread_deletions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.messages_v2 CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'LISTING' CHECK (type IN ('LISTING', 'DIRECT')),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'BLOCKED', 'CLOSED')),
  context JSONB,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_last_read_at TIMESTAMPTZ,
  seller_last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conversations_participants_distinct CHECK (buyer_user_id <> seller_user_id),
  CONSTRAINT conversations_listing_presence CHECK (
    (type = 'LISTING' AND listing_id IS NOT NULL) OR
    (type = 'DIRECT' AND listing_id IS NULL)
  )
);

CREATE UNIQUE INDEX conversations_unique_listing_thread
  ON public.conversations (listing_id, buyer_user_id, seller_user_id)
  WHERE type = 'LISTING';

CREATE UNIQUE INDEX conversations_unique_direct_pair
  ON public.conversations (
    LEAST(buyer_user_id, seller_user_id),
    GREATEST(buyer_user_id, seller_user_id)
  )
  WHERE type = 'DIRECT';

CREATE INDEX idx_conversations_buyer ON public.conversations(buyer_user_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON public.conversations(seller_user_id, last_message_at DESC);
CREATE INDEX idx_conversations_listing ON public.conversations(listing_id);
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_status_active ON public.conversations(status) WHERE status = 'ACTIVE';

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_select_participants ON public.conversations;
CREATE POLICY conversations_select_participants ON public.conversations
  FOR SELECT USING (auth.uid() = buyer_user_id OR auth.uid() = seller_user_id);

DROP POLICY IF EXISTS conversations_insert_participants ON public.conversations;
CREATE POLICY conversations_insert_participants ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = buyer_user_id OR auth.uid() = seller_user_id);

DROP POLICY IF EXISTS conversations_update_participants ON public.conversations;
CREATE POLICY conversations_update_participants ON public.conversations
  FOR UPDATE USING (auth.uid() = buyer_user_id OR auth.uid() = seller_user_id);

-- Messages (timeline)
CREATE TABLE public.messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null for system messages
  type TEXT NOT NULL CHECK (type IN ('TEXT', 'IMAGE', 'SYSTEM', 'OFFER_CARD', 'PAYMENT_CARD')),
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT messages_v2_body_or_metadata CHECK (body IS NOT NULL OR metadata IS NOT NULL)
);

CREATE INDEX idx_messages_v2_conversation ON public.messages_v2(conversation_id, created_at DESC);
CREATE INDEX idx_messages_v2_sender ON public.messages_v2(sender_user_id);
CREATE INDEX idx_messages_v2_type_cards ON public.messages_v2(type) WHERE type IN ('OFFER_CARD', 'PAYMENT_CARD');
CREATE INDEX idx_messages_v2_metadata_offer ON public.messages_v2 USING gin(metadata) WHERE type = 'OFFER_CARD';

ALTER TABLE public.messages_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_v2_select_participants ON public.messages_v2;
CREATE POLICY messages_v2_select_participants ON public.messages_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages_v2.conversation_id
      AND (c.buyer_user_id = auth.uid() OR c.seller_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS messages_v2_insert_participants ON public.messages_v2;
CREATE POLICY messages_v2_insert_participants ON public.messages_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_user_id = auth.uid() OR c.seller_user_id = auth.uid())
    )
    AND (sender_user_id IS NULL OR sender_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = COALESCE(NEW.created_at, NOW()),
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

-- Offers
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'GBP',
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000000000),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  shipping_option_id UUID,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED')),
  parent_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_conversation ON public.offers(conversation_id, created_at DESC);
CREATE INDEX idx_offers_listing ON public.offers(listing_id);
CREATE INDEX idx_offers_status_pending ON public.offers(status) WHERE status = 'PENDING';
CREATE INDEX idx_offers_created_by ON public.offers(created_by_user_id);
CREATE INDEX idx_offers_offered_to ON public.offers(offered_to_user_id);
CREATE INDEX idx_offers_parent ON public.offers(parent_offer_id) WHERE parent_offer_id IS NOT NULL;

CREATE UNIQUE INDEX idx_offers_one_pending_per_conversation
  ON public.offers(conversation_id)
  WHERE status = 'PENDING';

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_select_participants ON public.offers;
CREATE POLICY offers_select_participants ON public.offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = offers.conversation_id
      AND (c.buyer_user_id = auth.uid() OR c.seller_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS offers_insert_creator_is_participant ON public.offers;
CREATE POLICY offers_insert_creator_is_participant ON public.offers
  FOR INSERT WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_user_id = auth.uid() OR c.seller_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS offers_update_participants ON public.offers;
CREATE POLICY offers_update_participants ON public.offers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = offers.conversation_id
      AND (c.buyer_user_id = auth.uid() OR c.seller_user_id = auth.uid())
    )
  );

-- Expire pending offers past deadline
CREATE OR REPLACE FUNCTION public.expire_old_offers()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.offers
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'PENDING'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Summaries view
CREATE OR REPLACE VIEW public.conversation_summaries AS
SELECT
  c.id,
  c.type,
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
  ) AS last_message_preview,
  (
    SELECT COUNT(*)
    FROM public.offers o
    WHERE o.conversation_id = c.id
      AND o.status = 'PENDING'
  ) AS pending_offers_count
FROM public.conversations c;

GRANT SELECT ON public.conversation_summaries TO authenticated, anon;

COMMIT;
