-- Add reservation fields for accepted offers (temporary hold)

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS reserved_by UUID,
ADD COLUMN IF NOT EXISTS reserved_offer_id UUID,
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listings_reserved_until ON listings(reserved_until) WHERE reserved_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_reserved_by ON listings(reserved_by) WHERE reserved_by IS NOT NULL;

COMMENT ON COLUMN listings.reserved_by IS 'User id holding the reservation (buyer)';
COMMENT ON COLUMN listings.reserved_offer_id IS 'Offer id that reserved the listing';
COMMENT ON COLUMN listings.reserved_until IS 'Reservation expiry timestamp';
COMMENT ON COLUMN listings.reserved_at IS 'When the reservation was created';
