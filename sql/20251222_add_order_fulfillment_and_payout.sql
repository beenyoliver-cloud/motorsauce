-- Add fulfillment + escrow/payout tracking to orders
--
-- Goals:
-- - Seller can mark an order as shipped (optionally with tracking details)
-- - Buyer can confirm an order as received
-- - Funds can be released AFTER received confirmation (or later automation)
--
-- Safe / additive migration; does not drop existing columns.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_by uuid,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'held',
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_reference text;

COMMENT ON COLUMN orders.shipped_at IS 'Timestamp when seller marked the order as shipped';
COMMENT ON COLUMN orders.shipped_by IS 'auth.users.id of seller who marked shipped (for audit)';
COMMENT ON COLUMN orders.shipping_carrier IS 'Optional shipping carrier name (e.g. Royal Mail)';
COMMENT ON COLUMN orders.tracking_number IS 'Optional tracking number provided by seller';
COMMENT ON COLUMN orders.delivery_confirmed_at IS 'Timestamp when buyer confirmed delivery/receipt';
COMMENT ON COLUMN orders.delivery_confirmed_by IS 'auth.users.id of buyer who confirmed delivery';
COMMENT ON COLUMN orders.payout_status IS 'Escrow/payout state: held | release_requested | released | failed';
COMMENT ON COLUMN orders.payout_released_at IS 'Timestamp when payout was released/marked released';
COMMENT ON COLUMN orders.payout_reference IS 'Optional reference/Stripe transfer id for payout';

CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders (shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_confirmed_at ON orders (delivery_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_orders_payout_status ON orders (payout_status);
