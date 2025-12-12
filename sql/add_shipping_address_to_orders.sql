-- Add shipping_address column to orders table
-- This is needed to store customer delivery address

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add comment to explain the structure
COMMENT ON COLUMN orders.shipping_address IS 'JSON object containing: fullName, email, line1, line2 (optional), city, postcode';

-- Example structure:
-- {
--   "fullName": "John Doe",
--   "email": "john@example.com",
--   "line1": "123 Test Street",
--   "line2": "Apt 4B",
--   "city": "London",
--   "postcode": "SW1A 1AA"
-- }
