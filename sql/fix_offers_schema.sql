-- Fix offers table schema to work with new messaging system
-- Ensures all required columns exist and data is migrated

-- Add missing columns if they don't exist
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS thread_id UUID;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS listing_title TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS listing_image TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS starter_id UUID;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate data from old columns to new columns if they exist and are populated
DO $$ 
BEGIN
  -- Migrate starter -> starter_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'starter') THEN
    UPDATE public.offers 
    SET starter_id = starter 
    WHERE starter_id IS NULL AND starter IS NOT NULL;
  END IF;

  -- Migrate recipient -> recipient_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'recipient') THEN
    UPDATE public.offers 
    SET recipient_id = recipient 
    WHERE recipient_id IS NULL AND recipient IS NOT NULL;
  END IF;

  -- Migrate amount -> amount_cents (assuming amount is in decimal pounds)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'amount') THEN
    UPDATE public.offers 
    SET amount_cents = (amount * 100)::INTEGER
    WHERE amount_cents IS NULL AND amount IS NOT NULL;
  END IF;
END $$;

-- Add constraints
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'rejected', 'countered', 'withdrawn', 'expired'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_amount_positive;
ALTER TABLE public.offers ADD CONSTRAINT offers_amount_positive 
  CHECK (amount_cents IS NULL OR amount_cents > 0);

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_participants_different;
ALTER TABLE public.offers ADD CONSTRAINT offers_participants_different 
  CHECK (starter_id IS NULL OR recipient_id IS NULL OR starter_id != recipient_id);

-- Ensure messages table has offer columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_amount_cents INTEGER;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_currency TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_status TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_thread_id ON public.offers(thread_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_starter_id ON public.offers(starter_id);
CREATE INDEX IF NOT EXISTS idx_offers_recipient_id ON public.offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON public.offers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_offer_id ON public.messages(offer_id) WHERE offer_id IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_offers_updated_at ON public.offers;
CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();

-- Add RLS policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own offers as buyer" ON public.offers;
DROP POLICY IF EXISTS "Users can view offers on their listings as seller" ON public.offers;
DROP POLICY IF EXISTS "Users can create offers" ON public.offers;
DROP POLICY IF EXISTS "Users can update their own pending offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can update offers on their listings" ON public.offers;

-- Buyers can view their own offers
CREATE POLICY "Users can view their own offers as buyer"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = starter_id OR auth.uid() = starter);

-- Sellers can view offers on their listings
CREATE POLICY "Users can view offers on their listings as seller"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = recipient_id OR auth.uid() = recipient);

-- Users can create offers (as buyer/starter)
CREATE POLICY "Users can create offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    (auth.uid() = starter_id AND starter_id IS NOT NULL)
    OR (auth.uid() = starter AND starter IS NOT NULL)
  );

-- Buyers can update their own pending/countered offers (withdraw)
CREATE POLICY "Users can update their own pending offers"
  ON public.offers
  FOR UPDATE
  USING (
    auth.uid() = starter_id
    AND status IN ('pending', 'countered')
  )
  WITH CHECK (
    status IN ('pending', 'withdrawn')
  );

-- Sellers can respond to offers (accept, decline, counter)
CREATE POLICY "Sellers can update offers on their listings"
  ON public.offers
  FOR UPDATE
  USING (
    auth.uid() = recipient_id
    AND status IN ('pending', 'countered')
  )
  WITH CHECK (
    status IN ('accepted', 'declined', 'rejected', 'countered')
  );

COMMENT ON TABLE public.offers IS 'Buyer offers on listings with status tracking and negotiation support';
