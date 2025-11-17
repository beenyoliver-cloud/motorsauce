-- Create offers table for Make Offer functionality
-- Allows buyers to submit offers below asking price

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Offer details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  message TEXT,
  
  -- Status: pending, accepted, rejected, countered, expired, withdrawn
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
  
  -- Counter offer (if seller counters)
  counter_amount_cents INTEGER CHECK (counter_amount_cents IS NULL OR counter_amount_cents > 0),
  counter_message TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
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

-- Buyers can view their own offers
CREATE POLICY "Buyers can view their offers"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view offers on their listings
CREATE POLICY "Sellers can view offers on their listings"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Buyers can create offers (insert)
CREATE POLICY "Buyers can create offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() != seller_id
  );

-- Buyers can withdraw their pending offers
CREATE POLICY "Buyers can withdraw pending offers"
  ON public.offers
  FOR UPDATE
  USING (
    auth.uid() = buyer_id
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
    auth.uid() = seller_id
    AND status IN ('pending', 'countered')
  )
  WITH CHECK (
    status IN ('accepted', 'rejected', 'countered')
  );

-- Comments for documentation
COMMENT ON TABLE public.offers IS 'Buyer offers on listings - allows price negotiation';
COMMENT ON COLUMN public.offers.amount_cents IS 'Offer amount in cents (GBP)';
COMMENT ON COLUMN public.offers.status IS 'pending, accepted, rejected, countered, expired, withdrawn';
COMMENT ON COLUMN public.offers.expires_at IS 'Offer expires after 48 hours by default';
COMMENT ON COLUMN public.offers.counter_amount_cents IS 'Seller counter-offer amount in cents';
