-- Allow listing-less conversations and enforce uniqueness rules
-- 1) Make listing_id nullable
-- 2) Remove old unique constraint and replace with partial unique indexes
-- 3) Keep existing FK

BEGIN;

-- Drop old unique constraint
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_unique_buyer_listing;

-- Make listing optional
ALTER TABLE public.conversations
  ALTER COLUMN listing_id DROP NOT NULL;

-- Ensure uniqueness when listing present: one convo per buyer/listing
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_buyer_listing_idx
  ON public.conversations (listing_id, buyer_user_id)
  WHERE listing_id IS NOT NULL;

-- Ensure only one listing-less conversation per participant pair (order-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_pair_no_listing
  ON public.conversations (
    LEAST(buyer_user_id, seller_user_id),
    GREATEST(buyer_user_id, seller_user_id)
  )
  WHERE listing_id IS NULL;

COMMIT;
