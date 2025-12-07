-- Clean standalone offers system - not coupled to messages
-- Simpler schema, easier to manage, more professional

-- Create simplified offers table (if doesn't exist, create fresh)
-- Drop old complex one if exists
DROP TABLE IF EXISTS public.offers CASCADE;

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Snapshot of listing data at time of offer
  listing_title TEXT NOT NULL,
  listing_image TEXT,
  listing_price NUMERIC NOT NULL,
  
  -- Offer amount
  offered_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GBP',
  
  -- Status flow: pending -> accepted/declined/countered
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'withdrawn')),
  
  -- Counter offer support
  counter_amount NUMERIC,
  counter_message TEXT,
  last_countered_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Metadata
  created_by_notes TEXT,
  counter_notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_created_at ON public.offers(created_at DESC);

-- RLS Policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Users can see offers they're involved in
CREATE POLICY "Users can view their own offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Buyers can create offers
CREATE POLICY "Users can create offers as buyer"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND buyer_id != seller_id);

-- Both parties can update (respond to) offers
CREATE POLICY "Users can respond to offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
