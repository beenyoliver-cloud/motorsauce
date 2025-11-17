-- Create offers_new table for Make Offer functionality (enhanced version)
-- Note: The existing 'offers' table uses 'starter' and 'recipient' columns
-- This new table uses more intuitive 'buyer_id' and 'seller_id' naming

-- First, check if we need to migrate or if we can add to existing table
-- Option 1: Add columns to existing offers table
ALTER TABLE public.offers 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS counter_amount DECIMAL(10,2) CHECK (counter_amount IS NULL OR counter_amount > 0),
  ADD COLUMN IF NOT EXISTS counter_message TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Update existing offers to have 'pending' status if NULL
UPDATE public.offers SET status = 'pending' WHERE status IS NULL;

-- Add constraint to existing table (starter = buyer, recipient = seller)
-- Note: starter is the buyer (person making offer), recipient is the seller
ALTER TABLE public.offers 
  ADD CONSTRAINT IF NOT EXISTS buyer_not_seller CHECK (starter != recipient);

-- Indexes for performance (using existing column names)
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_starter ON public.offers(starter);
CREATE INDEX IF NOT EXISTS idx_offers_recipient ON public.offers(recipient);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);

-- Updated_at trigger
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

-- Auto-expire old offers function
CREATE OR REPLACE FUNCTION auto_expire_offers()
RETURNS void AS $$
BEGIN
  UPDATE public.offers
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Buyers can view their offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can view offers on their listings" ON public.offers;
DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;
DROP POLICY IF EXISTS "Buyers can withdraw pending offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can respond to offers" ON public.offers;

-- Buyers (starter) can view their own offers
CREATE POLICY "Buyers can view their offers"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = starter);

-- Sellers (recipient) can view offers on their listings
CREATE POLICY "Sellers can view offers on their listings"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = recipient);

-- Buyers can create offers (insert)
CREATE POLICY "Buyers can create offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = starter
    AND auth.uid() != recipient
  );

-- Buyers can withdraw their pending offers
CREATE POLICY "Buyers can withdraw pending offers"
  ON public.offers
  FOR UPDATE
  USING (
    auth.uid() = starter
    AND status = 'pending'
  )
  WITH CHECK (
    status IN ('withdrawn', 'pending')
  );

-- Sellers can respond to offers (accept, reject, counter)
CREATE POLICY "Sellers can respond to offers"
  ON public.offers
  FOR UPDATE
  USING (
    auth.uid() = recipient
    AND status IN ('pending', 'countered')
  )
  WITH CHECK (
    status IN ('accepted', 'rejected', 'countered')
  );

-- Comments for documentation
COMMENT ON TABLE public.offers IS 'Buyer offers on listings - allows price negotiation';
COMMENT ON COLUMN public.offers.amount IS 'Offer amount in GBP (decimal)';
COMMENT ON COLUMN public.offers.status IS 'pending, accepted, rejected, countered, expired, withdrawn';
COMMENT ON COLUMN public.offers.expires_at IS 'Offer expires after 48 hours by default';
COMMENT ON COLUMN public.offers.counter_amount IS 'Seller counter-offer amount in GBP (decimal)';
COMMENT ON COLUMN public.offers.starter IS 'Buyer user ID (person making the offer)';
COMMENT ON COLUMN public.offers.recipient IS 'Seller user ID (person receiving the offer)';
