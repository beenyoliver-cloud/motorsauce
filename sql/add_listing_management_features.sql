-- Add listing management features: drafts, sold status, address/distance, image validation

-- 1. Add status column (active, draft, sold)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status_enum') THEN
    CREATE TYPE listing_status_enum AS ENUM ('active', 'draft', 'sold');
  END IF;
END $$;

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS status listing_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS draft_reason TEXT,
ADD COLUMN IF NOT EXISTS marked_sold_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS images_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS images_validation_failed BOOLEAN DEFAULT false;

-- 2. Add seller address fields for distance calculation
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS seller_postcode TEXT,
ADD COLUMN IF NOT EXISTS seller_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS seller_lng NUMERIC(10, 7);

-- 3. Create index for status queries
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_location ON listings(seller_lat, seller_lng) WHERE status = 'active';

-- 4. Update RLS policies to hide drafts from public
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
DROP POLICY IF EXISTS "Public listings are viewable by all" ON listings;

-- Allow users to see their own listings regardless of status
CREATE POLICY "Users can view own listings"
  ON listings
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Allow public to see only active listings
CREATE POLICY "Public can view active listings"
  ON listings
  FOR SELECT
  USING (status = 'active');

-- Allow users to update their own listings
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
CREATE POLICY "Users can update own listings"
  ON listings
  FOR UPDATE
  USING (auth.uid() = seller_id);

-- Allow users to delete their own listings
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;
CREATE POLICY "Users can delete own listings"
  ON listings
  FOR DELETE
  USING (auth.uid() = seller_id);

-- 5. Create function to validate listing completeness
CREATE OR REPLACE FUNCTION check_listing_completeness(
  p_title TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_category TEXT,
  p_images TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_is_complete BOOLEAN := true;
BEGIN
  -- Check required fields
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    v_reasons := array_append(v_reasons, 'Title is required');
    v_is_complete := false;
  END IF;

  IF p_description IS NULL OR TRIM(p_description) = '' OR LENGTH(TRIM(p_description)) < 20 THEN
    v_reasons := array_append(v_reasons, 'Description must be at least 20 characters');
    v_is_complete := false;
  END IF;

  IF p_price IS NULL OR p_price <= 0 THEN
    v_reasons := array_append(v_reasons, 'Valid price is required');
    v_is_complete := false;
  END IF;

  IF p_category IS NULL OR TRIM(p_category) = '' THEN
    v_reasons := array_append(v_reasons, 'Category is required');
    v_is_complete := false;
  END IF;

  IF p_images IS NULL OR array_length(p_images, 1) IS NULL OR array_length(p_images, 1) = 0 THEN
    v_reasons := array_append(v_reasons, 'At least one image is required');
    v_is_complete := false;
  END IF;

  RETURN json_build_object(
    'is_complete', v_is_complete,
    'reasons', v_reasons
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_listing_completeness TO authenticated;

-- 6. Create function to calculate distance between postcodes (approximate)
-- This uses the Haversine formula for distance calculation
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC,
  lng1 NUMERIC,
  lat2 NUMERIC,
  lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_earth_radius NUMERIC := 6371; -- Earth radius in kilometers
  v_dlat NUMERIC;
  v_dlng NUMERIC;
  v_a NUMERIC;
  v_c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  v_dlat := radians(lat2 - lat1);
  v_dlng := radians(lng2 - lng1);
  
  v_a := sin(v_dlat / 2) * sin(v_dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(v_dlng / 2) * sin(v_dlng / 2);
  
  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
  
  RETURN v_earth_radius * v_c;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_distance_km TO authenticated, anon;

-- 7. Add function to auto-draft listings with broken images
CREATE OR REPLACE FUNCTION mark_listing_as_draft(
  p_listing_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET 
    status = 'draft',
    draft_reason = p_reason,
    images_validation_failed = true
  WHERE id = p_listing_id
  AND seller_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION mark_listing_as_draft TO authenticated;

-- 8. Create a view for active listings with distance (for authenticated users)
CREATE OR REPLACE VIEW active_listings_with_distance AS
SELECT 
  l.*,
  CASE 
    WHEN l.seller_lat IS NOT NULL AND l.seller_lng IS NOT NULL 
    THEN calculate_distance_km(
      l.seller_lat, 
      l.seller_lng,
      (SELECT seller_lat FROM listings WHERE seller_id = auth.uid() LIMIT 1),
      (SELECT seller_lng FROM listings WHERE seller_id = auth.uid() LIMIT 1)
    )
    ELSE NULL
  END as distance_km
FROM listings l
WHERE l.status = 'active';

-- Grant access to the view
GRANT SELECT ON active_listings_with_distance TO authenticated, anon;

COMMENT ON COLUMN listings.status IS 'Listing status: active (visible to all), draft (only visible to seller), sold (marked as sold)';
COMMENT ON COLUMN listings.draft_reason IS 'Reason why listing is in draft status (e.g., missing images, incomplete info)';
COMMENT ON COLUMN listings.seller_postcode IS 'Seller postcode for distance calculations (stored for reference)';
COMMENT ON COLUMN listings.seller_lat IS 'Seller latitude (approximate, from postcode) for distance calculations';
COMMENT ON COLUMN listings.seller_lng IS 'Seller longitude (approximate, from postcode) for distance calculations';
COMMENT ON COLUMN listings.images_validated_at IS 'Last time images were validated';
COMMENT ON COLUMN listings.images_validation_failed IS 'Whether image validation failed (images not accessible)';
