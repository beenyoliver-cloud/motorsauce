-- =============================================================================
-- ADD NEW LISTING FIELDS MIGRATION
-- =============================================================================
-- This script adds new fields to the listings table:
-- - part_type: categorize parts (Engine, Brakes, etc.)
-- - quantity: how many items available
-- - postcode: seller location for shipping estimates
-- - shipping_option: collection, delivery, or both
-- - accepts_returns: whether returns are accepted
-- - return_days: number of days for returns (7, 14, 30)
-- =============================================================================

-- Add new columns to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS part_type text,
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS shipping_option text DEFAULT 'both',
ADD COLUMN IF NOT EXISTS accepts_returns boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS return_days integer;

-- Add check constraints for data validation
ALTER TABLE public.listings
ADD CONSTRAINT quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT shipping_option_valid CHECK (shipping_option IN ('collection', 'delivery', 'both')),
ADD CONSTRAINT return_days_valid CHECK (return_days IS NULL OR return_days IN (7, 14, 30));

-- Create indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_listings_part_type ON public.listings(part_type);
CREATE INDEX IF NOT EXISTS idx_listings_postcode ON public.listings(postcode);
CREATE INDEX IF NOT EXISTS idx_listings_shipping_option ON public.listings(shipping_option);
CREATE INDEX IF NOT EXISTS idx_listings_accepts_returns ON public.listings(accepts_returns);

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'listings'
  AND column_name IN ('part_type', 'quantity', 'postcode', 'shipping_option', 'accepts_returns', 'return_days')
ORDER BY ordinal_position;

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify the output shows all 6 new columns
-- 3. Existing listings will have NULL values for new fields (except quantity=1, shipping_option='both')
-- 4. New listings will include these fields automatically
-- =============================================================================
