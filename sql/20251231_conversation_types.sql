-- Add conversation type (LISTING, DIRECT) and enforce listing_id rules
-- Also update uniqueness and conversation_summaries view

BEGIN;

-- 1) Add type column with default and check
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'DIRECT' CHECK (type IN ('LISTING', 'DIRECT'));

-- 2) Backfill types based on listing_id
UPDATE public.conversations
SET type = CASE WHEN listing_id IS NULL THEN 'DIRECT' ELSE 'LISTING' END;

-- 3) Enforce LISTING requires listing_id and DIRECT requires NULL listing_id
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_listing_presence;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_listing_presence
  CHECK ( (type = 'LISTING' AND listing_id IS NOT NULL) OR (type = 'DIRECT' AND listing_id IS NULL) );

-- 4) Drop old unique indexes
DROP INDEX IF EXISTS conversations_unique_buyer_listing_idx;
DROP INDEX IF EXISTS conversations_unique_pair_no_listing;

-- 5) Add unique indexes per type
-- One conversation per buyer+seller+listing for LISTING type
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_listing_thread
  ON public.conversations (listing_id, buyer_user_id, seller_user_id)
  WHERE type = 'LISTING';

-- One direct conversation per participant pair (order-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_direct_pair
  ON public.conversations (
    LEAST(buyer_user_id, seller_user_id),
    GREATEST(buyer_user_id, seller_user_id)
  )
  WHERE type = 'DIRECT';

-- 6) Update conversation_summaries view to include type
DROP VIEW IF EXISTS public.conversation_summaries;
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
    WHERE o.listing_id = c.listing_id
      AND (o.buyer_id = c.buyer_user_id OR o.seller_id = c.seller_user_id)
      AND o.status = 'pending'
  ) AS pending_offers_count
FROM public.conversations c;

GRANT SELECT ON public.conversation_summaries TO authenticated, anon;

COMMIT;
