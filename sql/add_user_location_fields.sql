-- Add location fields to profiles table for user account settings
-- This allows users to set their location which displays as "County, Country" on their profile
-- and can be used for distance calculations

-- Add location columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add index for faster location queries
CREATE INDEX IF NOT EXISTS idx_profiles_county_country ON profiles(county, country);

-- Add comment explaining the purpose
COMMENT ON COLUMN profiles.postcode IS 'User postcode for distance calculations (not displayed publicly)';
COMMENT ON COLUMN profiles.county IS 'User county - displayed publicly as "County, Country"';
COMMENT ON COLUMN profiles.country IS 'User country - displayed publicly as "County, Country"';
