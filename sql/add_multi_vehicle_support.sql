-- Migration: Add multi-vehicle support to listings
-- Adds vehicles JSONB column while maintaining backward compatibility

-- 1. Add vehicles column (nullable)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT NULL;

-- 2. Populate vehicles for existing listings with make/model/year
-- This preserves existing data in the vehicles array format
UPDATE listings 
SET vehicles = jsonb_build_array(
  jsonb_build_object(
    'make', COALESCE(make, ''),
    'model', COALESCE(model, ''),
    'year', year,
    'universal', false
  )
)
WHERE vehicles IS NULL 
  AND (make IS NOT NULL OR model IS NOT NULL OR year IS NOT NULL);

-- 3. For listings with no vehicle info (generic tools), mark as universal
UPDATE listings 
SET vehicles = jsonb_build_array(
  jsonb_build_object(
    'make', '',
    'model', '',
    'year', NULL,
    'universal', true
  )
)
WHERE vehicles IS NULL 
  AND category = 'Tool';

-- 4. Create index for better performance on vehicle queries
CREATE INDEX IF NOT EXISTS idx_listings_vehicles 
ON listings USING GIN (vehicles);

-- 5. Add comment explaining the schema
COMMENT ON COLUMN listings.vehicles IS 
'JSON array of vehicles this part fits. Each object: {make, model, year, universal}. 
Universal flag indicates part fits all vehicles (e.g. tools). 
Backward compatible with make/model/year columns.';
